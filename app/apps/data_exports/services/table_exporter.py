import csv
import tempfile

from core.models import Document

from apps.data_exports.helpers import normalize_value


def serialize_model(obj):

    data = {}

    for field in obj._meta.fields:

        value = getattr(obj, field.name)

        # ForeignKey → ID
        if hasattr(value, "id"):
            value = value.id

        data[field.name] = value

    return data


class TableExporter:

    TABLES = {
        "documents": "export_documents",
        "parts": "export_parts",
        "blocks": "export_blocks",
        "lines": "export_lines",
        "transcriptions": "export_transcriptions",
        "image_annotations": "export_image_annotations",
        "text_annotations": "export_text_annotations",
    }

    def export_lines(self, document):

        rows = []

        for part, line in self.iter_lines(document):
            rows.append(serialize_model(line))

        return rows

    def export_project_lines(self, project_id):

        rows = []

        documents = Document.objects.filter(project_id=project_id).prefetch_related(
            "parts__lines"
        )

        for document in documents:
            rows.extend(self.export_lines(document))

        return rows

    def write_csv(self, rows):

        tmp = tempfile.NamedTemporaryFile(
            mode="w+",
            suffix=".csv",
            delete=False
        )

        if not rows:
            return tmp.name

        fieldnames = rows[0].keys() if rows else []

        writer = csv.DictWriter(tmp, fieldnames=fieldnames)

        writer.writeheader()

        for row in rows:
            writer.writerow({k: normalize_value(v) for k, v in row.items()})

        tmp.flush()

        return tmp.name

    def export_document(self, document):
        return {
            "documents": self.export_documents([document]),
            "parts": self.export_parts(document),
            "blocks": self.export_blocks(document),
            "lines": self.export_lines(document),
            "transcriptions": self.export_transcriptions(document),
            "image_annotations": self.export_image_annotations(document),
            "text_annotations": self.export_text_annotations(document),
        }

    def export_documents(self, documents):

        rows = []

        for doc in documents:
            rows.append(serialize_model(doc))

        return rows

    def export_parts(self, document):

        rows = []

        for part in self.iter_parts(document):
            rows.append(serialize_model(part))

        return rows


    def export_transcriptions(self, document):

        rows = []

        for part, line in self.iter_lines(document):
            for t in line.transcriptions.all():
                rows.append(serialize_model(t))

        return rows

    def export_image_annotations(self, document):

        rows = []

        for part in self.iter_parts(document):
            for ann in part.imageannotation_set.all():
                rows.append(serialize_model(ann))

        return rows

    def export_text_annotations(self, document):

        rows = []

        for part in self.iter_parts(document):
            for ann in part.textannotation_set.all():
                rows.append(serialize_model(ann))

        return rows

    def export_document_tables(self, document):

        tables = {}

        for name, func in self.TABLES.items():
            tables[name] = getattr(self, func)(document)

        return tables


    def export_project_tables(self, project_id):

        tables = {name: [] for name in self.TABLES}

        documents = (
            Document.objects
            .filter(project_id=project_id)
            .prefetch_related(
                "parts__lines__transcriptions",
                "parts__blocks",
                "parts__imageannotation_set__components",
                "parts__textannotation_set__components",
            )
        )

        for doc in documents:

            doc_tables = self.export_document_tables(doc)

            for name, rows in doc_tables.items():
                tables[name].extend(rows)

        return tables

    def export_blocks(self, document):

        rows = []

        for part in self.iter_parts(document):
            for block in part.blocks.all():
                rows.append(serialize_model(block))

        return rows

    def iter_parts(self, document):
        for part in document.parts.all().iterator():
            yield part

    def iter_lines(self, document):
        for part in self.iter_parts(document):
            for line in part.lines.all():
                yield part, line

