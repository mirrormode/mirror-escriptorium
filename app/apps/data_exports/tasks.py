import json
import tempfile
import zipfile

from celery import shared_task
from django.contrib.auth import get_user_model
from django.core.files import File
from django.utils import timezone

from .models import ExportJob
from .services.raw_json_exporter import RawJSONExporter


@shared_task(bind=True)
def run_export_job(self, job_id, user_id=None):

    from django.contrib.auth import get_user_model
    User = get_user_model()

    job = ExportJob.objects.get(pk=job_id)

    job.status = "running"
    job.save()

    user = None
    if user_id:
        user = User.objects.get(pk=user_id)

    try:

        exporter = RawJSONExporter(
            anonymize=job.anonymize
        )

        if job.scope == "document":
            data = exporter.export_document(job.document_id)

        elif job.scope == "project":
            data = exporter.export_project(job.project_id)
        else:
            raise ValueError("Invalid export scope")

        # JSON temporär schreiben
        with tempfile.NamedTemporaryFile(
                mode="w+",
                suffix=".json",
                delete=False
        ) as tmp_json:

            json.dump(data, tmp_json, indent=2)
            tmp_json.flush()

            if job.include_images:

                with tempfile.NamedTemporaryFile(
                        suffix=".zip",
                        delete=False
                ) as tmp_zip:

                    with zipfile.ZipFile(tmp_zip.name, "w") as zipf:

                        # JSON hinzufügen
                        zipf.write(tmp_json.name, "export.json")

                        document = job.document

                        for part in document.parts.all():

                            if part.image and part.image.file:
                                zipf.write(
                                    part.image.path,
                                    f"images/part_{part.id}_{part.image.name}"
                                )

                    job.file.save(
                        f"export_{job.id}.zip",
                        File(open(tmp_zip.name, "rb"))
                    )

            else:

                job.file.save(
                    f"export_{job.id}.json",
                    File(open(tmp_json.name, "rb"))
                )

        job.status = "done"
        job.finished_at = timezone.now()
        job.save()

    except Exception as e:

        job.status = "failed"
        job.save()

        raise e