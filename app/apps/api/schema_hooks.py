from drf_spectacular.plumbing import build_basic_type
from drf_spectacular.types import OpenApiTypes


def fix_nested_pk_types(result, generator, request, public):
    for path, methods in result.get("paths", {}).items():
        for method in methods.values():
            for param in method.get("parameters", []):
                if param.get("in") == "path":
                    name = param.get("name", "")
                    if name.endswith("_pk") or name.endswith("_id"):
                        param["schema"] = build_basic_type(OpenApiTypes.INT)
    return result