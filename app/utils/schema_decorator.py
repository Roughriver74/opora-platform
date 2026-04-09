from app.config import DYNAMIC_FIELDS_TO_ADD


def add_dynamic_properties(cls):
    fields_to_add = DYNAMIC_FIELDS_TO_ADD
    for field_name, field_type in fields_to_add.items():
        default_value = 0 if field_type is int else None
        setattr(
            cls,
            field_name,
            property(
                lambda self, key=field_name, default=default_value: self.get_dynamic_field(
                    key, default
                )
            ),
        )
    return cls
