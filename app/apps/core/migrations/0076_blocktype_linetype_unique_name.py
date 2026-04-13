from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0075_deduplicate_ontology_types"),
    ]

    operations = [
        migrations.AlterField(
            model_name="blocktype",
            name="name",
            field=models.CharField(max_length=128, unique=True),
        ),
        migrations.AlterField(
            model_name="linetype",
            name="name",
            field=models.CharField(max_length=128, unique=True),
        ),
    ]
