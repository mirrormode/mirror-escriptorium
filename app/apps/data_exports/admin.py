from django.contrib import admin
from .models import ExportJob


@admin.register(ExportJob)
class ExportJobAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "user",
        "scope",
        "export_type",
        "status",
        "created_at",
        "finished_at",
    )

    list_filter = (
        "status",
        "scope",
        "export_type",
    )

    search_fields = (
        "user__username",
        "id",
    )

    readonly_fields = (
        "user",
        "status",
        "file",
        "created_at",
        "finished_at",
        "error",
    )

    ordering = ("-created_at",)