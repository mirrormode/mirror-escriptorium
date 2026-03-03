from drf_spectacular.openapi import AutoSchema


class NestedAutoSchema(AutoSchema):

    def _resolve_path_parameters(self, path_variables):
        parameters = super()._resolve_path_parameters(path_variables)

        # parameters ist hier eine LISTE
        for param in parameters:
            name = param.get("name", "")
            if name.endswith("_id") or name.endswith("_pk"):
                param["schema"] = {"type": "integer"}

        return parameters