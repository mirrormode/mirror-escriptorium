from django.http import FileResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from .models import ExportJob
from .serializers import ExportJobSerializer


class ExportJobViewSet(viewsets.ModelViewSet):

    queryset = ExportJob.objects.all()
    serializer_class = ExportJobSerializer

    def get_queryset(self):
        return ExportJob.objects.filter(user=self.request.user)

    def perform_create(self, serializer):

        job = serializer.save(
            user=self.request.user,
            status="queued"
        )

        from .tasks import run_export_job
        run_export_job.delay(job.id, self.request.user.id)

    @action(detail=True, methods=["get"])
    def download(self, request, pk=None):

        job = self.get_object()

        if job.status != "done":
            return Response(
                {"error": "Export not finished yet"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not job.file:
            return Response(
                {"error": "No file available"},
                status=status.HTTP_404_NOT_FOUND
            )

        return FileResponse(
            job.file.open("rb"),
            as_attachment=True,
            filename=job.file.name.split("/")[-1]
        )