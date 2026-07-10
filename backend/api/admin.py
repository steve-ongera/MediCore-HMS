from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from api import models


@admin.register(models.User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("username", "first_name", "last_name", "role", "is_active_staff", "is_active")
    list_filter = ("role", "is_active_staff", "is_active")
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("HMIS", {"fields": ("role", "phone", "department", "profile_photo", "is_active_staff")}),
    )


admin.site.register(models.Department)
admin.site.register(models.Patient)
admin.site.register(models.Allergy)
admin.site.register(models.MedicalHistoryNote)
admin.site.register(models.Visit)
admin.site.register(models.Invoice)
admin.site.register(models.Payment)
admin.site.register(models.QueueEntry)
admin.site.register(models.VitalSigns)
admin.site.register(models.ICD10Code)
admin.site.register(models.Consultation)
admin.site.register(models.Prescription)
admin.site.register(models.LabTestCatalog)
admin.site.register(models.LabOrder)
admin.site.register(models.LabResult)
admin.site.register(models.RadiologyTestCatalog)
admin.site.register(models.RadiologyOrder)
admin.site.register(models.RadiologyResult)
admin.site.register(models.Supplier)
admin.site.register(models.Medicine)
admin.site.register(models.MedicineBatch)
admin.site.register(models.StockTransaction)
admin.site.register(models.PharmacyDispense)
admin.site.register(models.AuditLog)