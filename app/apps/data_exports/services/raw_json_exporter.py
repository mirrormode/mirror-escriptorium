import json
from django.forms.models import model_to_dict

from core.models import Document


class RawJSONExporter:

    def __init__(self, anonymize=True):
        self.anonymize = anonymize

    def export_document(self, document_id):

        document = (
            Document.objects
            .select_related("project")
            .prefetch_related(
                "metadatas",
                "tags",
                "parts__metadata",
                "parts__blocks",
                "parts__lines__transcriptions",
                "parts__imageannotation_set__components",
                "parts__textannotation_set__components",
            )
            .get(pk=document_id)
        )

        return {
            "document": self.serialize_document(document),
            "parts": [self.serialize_part(p) for p in document.parts.all()],
        }

    def export_project(self, project_id):

        documents = Document.objects.filter(project_id=project_id)

        return {
            "project_id": project_id,
            "documents": [
                self.export_document(doc.id)
                for doc in documents
            ]
        }


    def serialize_document(self, document):

        return {
            "id": document.id,
            "name": document.name,
            "project": document.project.name if document.project else None,
            "created_at": str(document.created_at),
            "updated_at": str(document.updated_at),
            "metadata": [
                {
                    "name": getattr(m, "name", None),
                    "value": getattr(m, "value", None)
                }
                for m in document.metadatas.all()
            ],
            "tags": [tag.name for tag in document.tags.all()],
        }

    def serialize_part(self, part):

        return {
            "id": part.id,
            "name": part.name,
            "order": part.order,
            "blocks": [self.serialize_block(b) for b in part.blocks.all()],
            "lines": [self.serialize_line(l) for l in part.lines.all()],
            "annotations": {
                "image": [self.serialize_image_annotation(a) for a in part.imageannotation_set.all()],
                "text": [self.serialize_text_annotation(a) for a in part.textannotation_set.all()],
            },
        }

    def serialize_block(self, block):

        return {
            "id": block.id,
            "external_id": block.external_id,
            "box": block.box,
            "typology": block.typology.name if block.typology else None,
        }

    def serialize_line(self, line):

        return {
            "id": line.id,
            "external_id": line.external_id,
            "order": line.order,
            "baseline": line.baseline,
            "mask": line.mask,
            "transcriptions": [
                self.serialize_transcription(t)
                for t in line.transcriptions.all()
            ],
        }

    def serialize_transcription(self, transcription):

        versions = transcription.versions or []

        if self.anonymize:
            versions = self.anonymize_versions(versions)

        return {
            "content": transcription.content,
            "avg_confidence": transcription.avg_confidence,
            "graphs": transcription.graphs,
            "versions": versions,
        }

    def serialize_image_annotation(self, annotation):

        return {
            "id": annotation.id,
            "taxonomy": annotation.taxonomy.name if annotation.taxonomy else None,
            "coordinates": annotation.coordinates,
            "components": [
                {
                    "name": c.component.name,
                    "value": c.value
                }
                for c in annotation.components.all()
            ],
            "comments": annotation.comments,
        }

    def serialize_text_annotation(self, annotation):

        return {
            "id": annotation.id,
            "taxonomy": annotation.taxonomy.name if annotation.taxonomy else None,
            "transcription": annotation.transcription_id,
            "start_line": annotation.start_line_id,
            "end_line": annotation.end_line_id,
            "components": [
                {
                    "name": c.component.name,
                    "value": c.value
                }
                for c in annotation.components.all()
            ],
            "comments": annotation.comments,
        }

    def anonymize_versions(self, versions):

        for v in versions:
            if "author" in v:
                v["author"] = "anonymous"

        return versions