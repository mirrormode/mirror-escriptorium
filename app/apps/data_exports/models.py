from django.db import models
from django.conf import settings

from core.models import Document, Project


class ExportJob(models.Model):
    STATUS_CHOICES = [
        ("queued", "Queued"),
        ("running", "Running"),
        ("done", "Done"),
        ("failed", "Failed"),
    ]

    SCOPE_CHOICES = [
        ("document", "Document"),
        ("project", "Project"),
    ]

    TYPE_CHOICES = [
        ("json", "Raw JSON"),
        ("table", "Table"),
        ("zip", "ZIP with JSON and images"),
        ("excel", "Excel"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="exports"
    )

    scope = models.CharField(max_length=20, choices=SCOPE_CHOICES)
    export_type = models.CharField(max_length=20, choices=TYPE_CHOICES)

    document = models.ForeignKey(
        Document,
        null=True,
        blank=True,
        on_delete=models.CASCADE
    )

    project = models.ForeignKey(
        Project,
        null=True,
        blank=True,
        on_delete=models.CASCADE
    )

    anonymize = models.BooleanField(default=True)
    include_images = models.BooleanField(default=False)

    file = models.FileField(
        upload_to="exports/",
        null=True,
        blank=True
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="queued"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    error = models.TextField(null=True, blank=True)

    def __str__(self):
        if self.scope == "document":
            return f"Export Document {self.document_id}"
        return f"Export Project {self.project_id}"

