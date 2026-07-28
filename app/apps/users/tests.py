from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user, get_user_model
from django.contrib.auth.models import Group, Permission
from django.core import mail
from django.test import TestCase, TransactionTestCase, override_settings
from django.urls import reverse

from core.models import Document, Project
from core.tests.factory import CoreFactory
from users.consumers import NotificationConsumer
from users.models import GroupOwner, Invitation, ResearchField
from users.models import User as CustomUser

User = get_user_model()


class AuthTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="test",
                                             password="test",
                                             email="test@test.com")

    def test_user_model(self):
        self.assertEqual(self.user.__class__, CustomUser)

        self.assertEqual(self.user.get_full_name(), "test")
        user = User.objects.create_user(
            first_name="John",
            last_name="Doe",
            username="jdoe",
            email="jdoe@test.com")
        self.assertEqual(user.get_full_name(), "John Doe")
        field = ResearchField.objects.create(name='test field')
        user.fields.add(field)
        self.assertEqual(str(field), 'test field')

    def test_login(self):
        with self.assertNumQueries(1):
            response = self.client.get(reverse('login'))
        self.assertEqual(response.status_code, 200)

        with self.assertNumQueries(9):
            response = self.client.post(reverse('login'),
                                        {'username': "test",
                                         'password': "test"})
        # TODO eventually: test errors
        self.assertNotContains(response, "error", status_code=302)
        user = get_user(self.client)
        self.assertTrue(user.is_authenticated)

    def test_logout(self):
        self.client.login(username="test", password="test")
        with self.assertNumQueries(4):
            response = self.client.get(reverse('logout'))
        self.assertEqual(response.status_code, 302)
        user = get_user(self.client)
        self.assertFalse(user.is_authenticated)


class InvitationTestCase(TestCase):
    def setUp(self):
        self.sender = User.objects.create_user(
            username='sender',
            password='test',
            email='sender@test.com')
        perm = Permission.objects.get(codename='can_invite')
        self.sender.user_permissions.add(perm)
        self.group = Group.objects.create(name='testgroup')
        self.sender.groups.add(self.group)

    def test_can_invite_perm(self):
        self.restricted = User.objects.create_user(
            username='restrict',
            password='test',
            email='restrict@test.com')

        self.client.force_login(self.restricted)

        response = self.client.get(reverse('send-invitation'))
        self.assertEqual(response.status_code, 403)

        response = self.client.post(reverse('send-invitation'),
                                    {"recipient_email": "recipient@test.com",
                                     "recipient_first_name": "john",
                                     "recipient_last_name": "doe",
                                     "group": self.group.pk})
        self.assertEqual(response.status_code, 403)

    def test_send(self):
        self.client.login(username='sender', password='test')
        with self.assertNumQueries(5):
            response = self.client.get(reverse('send-invitation'))
        self.assertEqual(response.status_code, 200)

        with self.assertNumQueries(9):
            response = self.client.post(reverse('send-invitation'),
                                        {"recipient_email": "recipient@test.com",
                                         "recipient_first_name": "john",
                                         "recipient_last_name": "doe",
                                         "group": self.group.pk})

        # TODO eventually: test errors
        self.assertNotContains(response, "error", status_code=302)

        self.assertEqual(Invitation.objects.count(), 1)
        invitation = Invitation.objects.first()

        self.assertEqual(len(mail.outbox), 1)
        self.assertTrue("invites" in mail.outbox[0].subject)
        self.assertTrue("recipient@test.com" in mail.outbox[0].recipients())
        url = reverse("accept-invitation", kwargs={"token": invitation.token.hex})
        self.assertTrue(url in mail.outbox[0].body)

        self.assertEqual(invitation.sender, self.sender)
        self.assertEqual(invitation.recipient_email, "recipient@test.com")
        self.assertEqual(invitation.group, self.group)
        self.assertEqual(invitation.workflow_state, Invitation.STATE_SENT)
        self.assertEqual(invitation.group, self.group)

    @override_settings(AUTH_PASSWORD_VALIDATORS=[])
    def test_accept(self):
        invitation = Invitation.objects.create(
            sender=self.sender,
            recipient_first_name="jim",
            recipient_last_name="doey",
            recipient_email="jim@test.com",
            group=self.group
        )

        url = reverse('accept-invitation', kwargs={'token': invitation.token})
        with self.assertNumQueries(3):
            response = self.client.get(url)
        self.assertEqual(response.status_code, 200)

        with self.assertNumQueries(8):
            response = self.client.post(url, {
                'email': invitation.recipient_email,
                'username': 'jimd',
                'first_name': "jim",
                'last_name': "doey",
                'password1': 'test',
                'password2': 'test',
            })

        # TODO eventually: test errors
        self.assertNotContains(response, "error", status_code=302)

        self.assertEqual(User.objects.count(), 2)  # sender + recipient
        user = User.objects.get(username="jimd")
        self.client.login(username="jimd", password="test")
        self.assertIn(self.group, user.groups.all())

        invitation.refresh_from_db()
        self.assertEqual(invitation.workflow_state, Invitation.STATE_ACCEPTED)


class NotificationTestCase(TestCase):
    """
    todo https://channels.readthedocs.io/en/latest/topics/testing.html
    """
    pass


class TeamTestCase(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="test",
                                              password="test",
                                              email="test@test.com")

        self.invitee = User.objects.create_user(username="test2",
                                                password="test2",
                                                email="test2@test.com")

        self.group = Group.objects.create(name='testgroup')
        self.group.user_set.add(self.owner)
        GroupOwner.objects.create(group=self.group, owner=self.owner)

    def test_accept(self):
        invitation = Invitation.objects.create(
            sender=self.owner,
            recipient=self.invitee,
            group=self.group)

        self.client.force_login(self.invitee)
        url = reverse('accept-group-invitation', kwargs={'slug': invitation.token})
        with self.assertNumQueries(8):
            response = self.client.get(url)
        self.assertEqual(response.status_code, 302)

        invitation.refresh_from_db()
        self.assertEqual(invitation.workflow_state, Invitation.STATE_ACCEPTED)

        self.assertEqual(self.group.user_set.count(), 2)

        self.invitee.refresh_from_db()
        self.assertEqual(self.invitee.groups.count(), 1)

    def test_remove_from_group(self):

        self.group.user_set.add(self.invitee)
        self.client.force_login(self.owner)
        url = reverse('team-remove-user', kwargs={'pk': self.group.pk})
        with self.assertNumQueries(13):
            response = self.client.post(url, data={'user': self.invitee.pk})
        self.assertEqual(response.status_code, 302)

        self.invitee.refresh_from_db()
        self.assertEqual(self.invitee.groups.count(), 0)

    def test_leave_group(self):

        self.group.user_set.add(self.invitee)
        self.client.force_login(self.invitee)
        url = reverse('team-leave', kwargs={'pk': self.group.pk})
        with self.assertNumQueries(4):
            response = self.client.post(url)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(self.invitee.groups.count(), 0)

    def test_transfer_ownership(self):
        self.group.user_set.add(self.invitee)
        self.client.force_login(self.owner)
        url = reverse('team-transfer-ownership', kwargs={'pk': self.group.pk})

        with self.assertNumQueries(7):
            response = self.client.post(url, data={'user': self.invitee.pk})
        self.assertEqual(response.status_code, 302)
        self.group.groupowner.refresh_from_db()
        self.assertEqual(self.group.groupowner.owner, self.invitee)


@override_settings(CHANNEL_LAYERS={
    "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}})
class WebsocketRoomScopingTestCase(TransactionTestCase):
    """join-room takes an object pk from the client, so the room is
    checked against what the connected user may read.

    Note the fixture: factory.make_project() get_or_creates on a hardcoded
    slug, so every call returns the same project whatever name it is given -
    and its owner then has legitimate project-owner rights over the second
    document. Both therefore get a project built directly, with its own slug,
    and setUp asserts the separation before any test runs.
    """

    def setUp(self):
        factory = CoreFactory()
        self.caller = factory.make_user()
        self.mine = factory.make_document(
            owner=self.caller,
            project=Project.objects.create(name='caller project',
                                           slug='caller-project',
                                           owner=self.caller))

        self.other = factory.make_user()
        self.theirs = factory.make_document(
            owner=self.other,
            project=Project.objects.create(name='other project',
                                           slug='other-project',
                                           owner=self.other))

        self.assertNotIn(self.theirs, Document.objects.for_user(self.caller))

    def connect_as(self, user):
        inner = NotificationConsumer.as_asgi()

        async def app(scope, receive, send):
            return await inner(dict(scope, user=user), receive, send)

        return WebsocketCommunicator(app, '/ws/notif/')

    async def join(self, comm, document, settle=1.0):
        await comm.send_json_to({'type': 'join-room',
                                 'object_cls': 'document',
                                 'object_pk': document.pk})
        # group_add now hits the database, so give it time to land.
        await comm.receive_nothing(timeout=settle)

    async def broadcast(self, document, name='part:workflow'):
        await get_channel_layer().group_send(
            'room-document-%d' % document.pk,
            {'type': 'notification_event', 'name': name,
             'data': {'id': 4242, 'task_id': 'a task'}})

    async def received(self, comm, timeout=2):
        try:
            return await comm.receive_json_from(timeout=timeout)
        except Exception:
            return None

    def test_unauthorised_room_receives_nothing(self):
        async_to_sync(self._unauthorised)()

    async def _unauthorised(self):
        comm = self.connect_as(self.caller)
        connected, _ = await comm.connect()
        self.assertTrue(connected)
        await self.join(comm, self.theirs)
        await self.broadcast(self.theirs)
        self.assertIsNone(await self.received(comm))

    def test_own_document_room_still_receives(self):
        async_to_sync(self._own)()

    async def _own(self):
        comm = self.connect_as(self.other)
        connected, _ = await comm.connect()
        self.assertTrue(connected)
        await self.join(comm, self.theirs)
        await self.broadcast(self.theirs)
        self.assertIsNotNone(await self.received(comm))
        await comm.disconnect()

    def test_refused_join_leaves_the_socket_usable(self):
        async_to_sync(self._refused_then_allowed)()

    async def _refused_then_allowed(self):
        comm = self.connect_as(self.caller)
        connected, _ = await comm.connect()
        self.assertTrue(connected)
        await self.join(comm, self.theirs, settle=0.1)
        await self.join(comm, self.mine)
        await self.broadcast(self.mine, name='ping')
        self.assertIsNotNone(await self.received(comm, timeout=3))
