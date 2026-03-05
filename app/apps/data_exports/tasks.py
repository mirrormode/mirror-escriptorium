import json
import tempfile
import zipfile
from datetime import datetime

from celery import shared_task
from django.core.files import File
from django.utils import timezone
from openpyxl import Workbook

from .models import ExportJob
from .services.raw_json_exporter import RawJSONExporter
from .services.table_exporter import TableExporter


def normalize_value(value):

    if value is None:
        return None

    if isinstance(value, (list, dict)):
        return json.dumps(value)

    if isinstance(value, datetime):
        return value.isoformat()

    return value

def save_json(data):

    tmp = tempfile.NamedTemporaryFile(
        mode="w+",
        suffix=".json",
        delete=False
    )

    json.dump(data, tmp, indent=2)
    tmp.flush()

    return tmp.name


def create_zip(data, document, job):

    json_path = save_json(data)

    tmp_zip = tempfile.NamedTemporaryFile(
        suffix=".zip",
        delete=False
    )

    with zipfile.ZipFile(tmp_zip.name, "w") as zipf:

        zipf.write(json_path, "export.json")

        if document:
            for part in document.parts.all():

                if part.image and part.image.name:
                    zipf.write(
                        part.image.path,
                        f"images/part_{part.id}_{part.image.name}"
                    )

    return tmp_zip.name


def export_csv(document):

    table = TableExporter()

    rows = table.export_lines(document)

    return table.write_csv(rows)


def export_excel(document=None, project_id=None):

    table = TableExporter()

    if document:
        tables = table.export_document_tables(document)

    elif project_id:
        tables = table.export_project_tables(project_id)

    else:
        raise ValueError("No document or project provided")

    wb = Workbook()

    # Default Sheet löschen
    wb.remove(wb.active)

    for name, rows in tables.items():

        ws = wb.create_sheet(title=name)

        if not rows:
            continue

        # Header
        ws.append(list(rows[0].keys()))

        # Rows
        for row in rows:
            ws.append([normalize_value(v) for v in row.values()])

    tmp = tempfile.NamedTemporaryFile(
        suffix=".xlsx",
        delete=False
    )

    wb.save(tmp.name)

    return tmp.name

def build_filename(job):

    ts = timezone.now().strftime("%Y%m%d_%H%M%S")

    if job.export_type == "json":
        ext = "zip" if job.include_images else "json"

    elif job.export_type == "table":
        ext = "csv"

    elif job.export_type == "excel":
        ext = "xlsx"

    else:
        ext = "dat"

    return f"{job.scope}_{job.id}_{ts}.{ext}"


@shared_task(bind=True)
def run_export_job(self, job_id, user_id=None):

    job = ExportJob.objects.get(pk=job_id)
    job.status = "running"
    job.save()

    try:

        exporter = RawJSONExporter(anonymize=job.anonymize)

        if job.scope == "document":
            data = exporter.export_document(job.document_id)
            document = job.document

        elif job.scope == "project":
            data = exporter.export_project(job.project_id)
            document = None

        else:
            raise ValueError("Invalid export scope")

        if job.export_type == "json":

            if job.include_images:
                filepath = create_zip(data, document, job)
            else:
                filepath = save_json(data)

        elif job.export_type == "table":

            table = TableExporter()

            if job.scope == "document":
                rows = table.export_lines(document)

            elif job.scope == "project":
                rows = table.export_project_lines(job.project_id)

            filepath = table.write_csv(rows)

        elif job.export_type == "excel":

            table = TableExporter()

            if job.scope == "document":
                filepath = export_excel(document=document)

            elif job.scope == "project":
                filepath = export_excel(project_id=job.project_id)


        else:
            raise ValueError("Invalid export type")

        with open(filepath, "rb") as f:
            job.file.save(
                build_filename(job),
                File(f)
            )

        job.file_size = job.file.size
        job.status = "done"
        job.finished_at = timezone.now()
        job.save()

    except Exception as e:
        job.status = "failed"
        job.error = str(e)
        job.save()
        raise