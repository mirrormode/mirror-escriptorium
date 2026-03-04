from rest_framework import serializers
from .models import ExportJob


class ExportJobSerializer(serializers.ModelSerializer):

    class Meta:
        model = ExportJob
        fields = "__all__"
        read_only_fields = (
            "id",
            "user",
            "status",
            "file",
            "created_at",
            "finished_at",
        )