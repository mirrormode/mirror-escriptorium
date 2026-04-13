from django.db import migrations
from django.db.models import Count, Min


def _dedupe_types(apps, type_model_name, fk_model_name, document_m2m_field, fk_column_name):
    """Consolidate duplicate Typology rows (same name) onto the canonical one.

    The canonical row is the one with the lowest id. All FKs and M2M rows
    pointing at duplicates are retargeted to the canonical row, then the
    duplicates are deleted.
    """
    TypeModel = apps.get_model("core", type_model_name)
    FKModel = apps.get_model("core", fk_model_name)
    Document = apps.get_model("core", "Document")
    ThroughModel = getattr(Document, document_m2m_field).through

    duplicates = list(
        TypeModel.objects.values("name")
        .annotate(n=Count("id"), canonical=Min("id"))
        .filter(n__gt=1)
    )

    for dup in duplicates:
        name = dup["name"]
        canonical_id = dup["canonical"]
        dup_ids = list(
            TypeModel.objects.filter(name=name)
            .exclude(id=canonical_id)
            .values_list("id", flat=True)
        )
        if not dup_ids:
            continue

        # Retarget FKs on Block/Line
        FKModel.objects.filter(typology_id__in=dup_ids).update(typology_id=canonical_id)

        # Retarget M2M rows: set the canonical fk where possible, drop where it
        # would create a duplicate row for the same document.
        for row in ThroughModel.objects.filter(**{f"{fk_column_name}__in": dup_ids}):
            exists = ThroughModel.objects.filter(
                document_id=row.document_id,
                **{fk_column_name: canonical_id},
            ).exists()
            if exists:
                row.delete()
            else:
                setattr(row, fk_column_name, canonical_id)
                row.save()

        # Finally delete the duplicate typology rows
        TypeModel.objects.filter(id__in=dup_ids).delete()


def deduplicate_types(apps, schema_editor):
    _dedupe_types(
        apps,
        type_model_name="BlockType",
        fk_model_name="Block",
        document_m2m_field="valid_block_types",
        fk_column_name="blocktype_id",
    )
    _dedupe_types(
        apps,
        type_model_name="LineType",
        fk_model_name="Line",
        document_m2m_field="valid_line_types",
        fk_column_name="linetype_id",
    )


def noop_reverse(apps, schema_editor):
    # Deduplication is not reversible: the duplicate rows are gone for good.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0074_instancesettings"),
    ]

    operations = [
        migrations.RunPython(deduplicate_types, noop_reverse),
    ]
