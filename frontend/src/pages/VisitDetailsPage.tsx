import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Divider,
  IconButton,
  Card,
  CardContent,
  CircularProgress,
  Tooltip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  useTheme,
  useMediaQuery,
  Fab,
  Grow,
  alpha,
  Snackbar,
  AlertTitle,
} from "@mui/material";
import {
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Sync as SyncIcon,
  AssignmentInd as AssignmentIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  SyncProblem as SyncProblemIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  CalendarMonth as CalendarIcon,
  MapOutlined,
  ChevronLeft as ChevronLeftIcon,
} from "@mui/icons-material";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  visitService,
  VisitDetails,
  VisitInput,
} from "../services/visitService";
import { DynamicFields } from "../components/DynamicFields";
import { adminApi, FieldMapping } from "../services/adminApi";
import { clinicService } from "../services/clinicService";
import { CreateTaskDialog } from "../components/CreateTaskDialog";
import { Task, taskService } from "../services/taskService";

interface Contact {
  id: number;
  name: string;
  bitrix_id: number;
  phone: string;
  email: string;
  position: string;
}

export const VisitDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [routeUrl, setRouteUrl] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "warning" | "info"
  >("info");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const handleSaveTask = async (taskData: Task) => {
    try {
      await taskService.createTask(taskData);
      setTaskDialogOpen(false); // Закрываем диалог после успешного создания
      setSnackbar({
        open: true,
        message: "Задача успешно заведена",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: "Ошибка при создании задачи",
        severity: "error",
      });
    }
  };

  const showSnackbar = (message: string) => {
    setSnackbarMessage(message);
    setSnackbarOpen(true);
  };

  const buildRoute = async () => {
    if (!visit?.company_id) return;

    try {
      const clinicData = await clinicService.getClinic(visit.company_id, false);

      if (
        !clinicData?.clinic_coordinates?.latitude ||
        !clinicData.clinic_coordinates?.longitude
      ) {
        showSnackbar("Координаты компании недоступны.");
        return;
      }

      const { latitude, longitude } = clinicData.clinic_coordinates;
      // ⚠️ УБЕДИТЕСЬ: нет пробелов!
      const url = `https://yandex.ru/maps/?mode=routes&rtext=~${longitude},${latitude}&rtt=auto`;

      // Сохраняем URL и показываем snackbar с ссылкой
      setRouteUrl(url);
      showSnackbar(
        "Маршрут готов. Нажмите на уведомление, чтобы открыть карту."
      );
    } catch (error) {
      console.error("Ошибка:", error);
      showSnackbar("Не удалось построить маршрут.");
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // State for confirmation dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [statusToUpdate, setStatusToUpdate] = useState<
    "success" | "fail" | null
  >(null);

  // Query for field mappings
  const { data: visitFieldMappings } = useQuery<FieldMapping[]>(
    ["fieldMappings", "visit"],
    () => adminApi.getFieldMappings("visit"),
    {
      staleTime: 300000, // 5 minutes
    }
  );

  const { data: clinicFieldMappings } = useQuery<FieldMapping[]>(
    ["fieldMappings", "clinic"],
    () => adminApi.getFieldMappings("clinic"),
    {
      staleTime: 300000, // 5 minutes
    }
  );

  const { data: doctorFieldMappings } = useQuery<FieldMapping[]>(
    ["fieldMappings", "doctor"],
    () => adminApi.getFieldMappings("doctor"),
    {
      staleTime: 300000, // 5 minutes
    }
  );
  // Вспомогательная функция для получения адреса клиники
  const getClinicAddress = (company: any): string => {
    if (!company) return "";

    // Проверяем основное поле адреса сначала
    if (
      company.address &&
      typeof company.address === "string" &&
      company.address.trim() !== ""
    ) {
      return company.address;
    }

    // Проверяем поля с динамическими данными
    if (company.dynamic_fields && typeof company.dynamic_fields === "object") {
      // Известные ID полей с адресами в Bitrix24
      const knownAddressFields = [
        "address", // стандартное поле
        "ADDRESS", // стандартное поле в верхнем регистре
        "6679726eb1750", // ID поля адреса в Bitrix
        "uf_crm_6679726eb1750", // ID с префиксом в нижнем регистре
        "UF_CRM_6679726eb1750", // ID с префиксом в верхнем регистре
        "uf_crm_address", // динамическое поле с префиксом в нижнем регистре
        "UF_CRM_ADDRESS", // динамическое поле с префиксом в верхнем регистре
      ];

      // Проверяем известные ID полей
      for (const fieldId of knownAddressFields) {
        if (
          company.dynamic_fields[fieldId] &&
          typeof company.dynamic_fields[fieldId] === "string" &&
          company.dynamic_fields[fieldId].trim() !== ""
        ) {
          return company.dynamic_fields[fieldId];
        }
      }

      // Ищем поля, которые могут содержать адрес по ключевым словам
      const dynamicFieldsKeys = Object.keys(company.dynamic_fields);

      // Сначала проверяем точные совпадения по слову 'address'
      const exactAddressKey = dynamicFieldsKeys.find(
        (key) =>
          key.toLowerCase() === "address" ||
          key.includes("ADDRESS") ||
          key.toLowerCase().includes("address")
      );

      if (
        exactAddressKey &&
        typeof company.dynamic_fields[exactAddressKey] === "string" &&
        company.dynamic_fields[exactAddressKey].trim() !== ""
      ) {
        return company.dynamic_fields[exactAddressKey];
      }

      // Затем проверяем ключи с UF_CRM_ префиксом
      const ufCrmAddressKey = dynamicFieldsKeys.find(
        (key) =>
          (key.startsWith("UF_CRM_") || key.startsWith("uf_crm_")) &&
          (key.includes("ADDRESS") || key.toLowerCase().includes("address"))
      );

      if (
        ufCrmAddressKey &&
        typeof company.dynamic_fields[ufCrmAddressKey] === "string" &&
        company.dynamic_fields[ufCrmAddressKey].trim() !== ""
      ) {
        return company.dynamic_fields[ufCrmAddressKey];
      }

      // Наконец, поиск по любому ключу, содержащему 'адрес' на русском
      const russianAddressKey = dynamicFieldsKeys.find(
        (key) =>
          company.dynamic_fields[key] &&
          typeof company.dynamic_fields[key] === "string" &&
          (key.toLowerCase().includes("адрес") ||
            company.dynamic_fields[key].toLowerCase().includes("улица") ||
            company.dynamic_fields[key].toLowerCase().includes("пр-т"))
      );

      if (
        russianAddressKey &&
        typeof company.dynamic_fields[russianAddressKey] === "string" &&
        company.dynamic_fields[russianAddressKey].trim() !== ""
      ) {
        return company.dynamic_fields[russianAddressKey];
      }
    }

    // Если ничего не найдено, проверяем bitrix_data
    if (company.bitrix_data) {
      if (
        company.bitrix_data.ADDRESS &&
        typeof company.bitrix_data.ADDRESS === "string" &&
        company.bitrix_data.ADDRESS.trim() !== ""
      ) {
        return company.bitrix_data.ADDRESS;
      }
    }

    // Возвращаем пустую строку, если ничего не найдено
    return "";
  };
  // Helper function to get display name for a field
  const getFieldDisplayName = (
    entityType: "visit" | "clinic" | "doctor",
    fieldId: string
  ): string => {
    let mappings: FieldMapping[] | undefined;

    if (entityType === "visit") mappings = visitFieldMappings;
    else if (entityType === "clinic") mappings = clinicFieldMappings;
    else if (entityType === "doctor") mappings = doctorFieldMappings;

    if (!mappings) return fieldId;

    const mapping = mappings.find(
      (m) => m.app_field_name === fieldId || m.bitrix_field_id === fieldId
    );

    return mapping ? mapping.display_name : fieldId;
  };

  const {
    data: visit,
    isLoading,
    error,
  } = useQuery<VisitDetails>({
    queryKey: ["visit", id],
    queryFn: () => visitService.getVisit(Number(id)),
    enabled: !!id,
    retry: 1,
  });

  // Form state
  const [formState, setFormState] = useState<Partial<VisitInput>>({});
  // Initialize form state when visit data is loaded
  React.useEffect(() => {
    if (visit) {
      setFormState({
        company_id: visit.company_id,
        visit_type: visit.visit_type,
        date: visit.date,
        status: visit.status,
        comment: visit.comment,
        with_distributor: visit.with_distributor,
        sansus: visit.sansus,
        doctor_ids: visit.doctors?.map((doctor) => doctor.id) || [],
        dynamic_fields: { ...(visit.dynamic_fields || {}) },
      });
    }
  }, [visit]);
  // Состояние для контактов
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isContactsLoading, setIsContactsLoading] = useState(false);

  // Функция для загрузки контактов компании
  const loadContactsForCompany = useCallback(
    async (companyId: number) => {
      if (!visit?.company_id) return;

      setIsContactsLoading(true);
      try {
        // Сначала получаем данные о клинике, чтобы узнать её bitrix_id
        const clinicData = await clinicService.getClinic(companyId, false);
        const bitrixId = clinicData?.bitrix_id;

        if (!bitrixId) {
          setContacts([]);
          return;
        }

        // Загружаем контакты из Bitrix24
        const response = await fetch(
          "${process.env.REACT_APP_BITRIX_URL || '/api/bitrix/'}crm.contact.list",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filter: { COMPANY_ID: bitrixId },
              select: ["ID", "NAME", "LAST_NAME", "EMAIL", "PHONE", "POST"],
            }),
          }
        );

        if (!response.ok) throw new Error("Failed to fetch contacts");
        const data = await response.json();

        setContacts(
          data.result?.map((contact: any) => ({
            id: parseInt(contact.ID),
            name:
              `${contact.NAME || ""} ${contact.LAST_NAME || ""}`.trim() ||
              "Unnamed Contact",
            bitrix_id: parseInt(contact.ID),
            phone: contact.PHONE?.[0]?.VALUE || "",
            email: contact.EMAIL?.[0]?.VALUE || "",
            position: contact.POST || "",
          })) || []
        );
      } catch (error) {
        setFormError(`Ошибка при загрузке контактов: ${String(error)}`);
        setContacts([]);
      } finally {
        setIsContactsLoading(false);
      }
    },
    [visit]
  );

  // Загружаем контакты при загрузке данных о визите
  useEffect(() => {
    if (visit?.company_id) {
      loadContactsForCompany(visit.company_id);
    }
  }, [visit, loadContactsForCompany]);

  // Mutation for updating visit
  const updateVisitMutation = useMutation({
    mutationFn: (visitData: VisitInput) =>
      visitService.updateVisit(Number(id), visitData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["visit", id] });
      queryClient.invalidateQueries({ queryKey: ["visits"] });
      setErrorMessage(null);
    },
    onError: (error: any) => {
      // Обрабатываем объекты ошибок валидации
      let message = "Ошибка при обновлении визита";

      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;

        // Проверяем, является ли detail объектом или массивом
        if (typeof detail === "object" && detail !== null) {
          if (Array.isArray(detail)) {
            // Если это массив ошибок
            message = detail
              .map((err) => {
                if (typeof err === "string") return err;
                return err.msg || JSON.stringify(err);
              })
              .join(", ");
          } else if (detail.msg) {
            // Если это объект с полем msg
            message = detail.msg;
          } else {
            // Пробуем преобразовать объект в строку
            try {
              message = JSON.stringify(detail);
            } catch (e) {
              message = "Неизвестная ошибка валидации";
            }
          }
        } else if (typeof detail === "string") {
          // Если это просто строка
          message = detail;
        }
      }

      setErrorMessage(message);
      setIsSaving(false);
    },
  });

  // Состояние для ошибки
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Mutation for updating visit status
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: "success" | "fail" }) =>
      visitService.updateVisitStatus(id, status),
    onSuccess: () => {
      setConfirmDialogOpen(false);
      setErrorMessage(null);
      // Обновляем данные после успешного обновления статуса
      queryClient.invalidateQueries({ queryKey: ["visit", id] });
      queryClient.invalidateQueries({ queryKey: ["visits"] });

      // Перенаправляем пользователя на страницу визитов после обновления статуса
      navigate("/visits");
    },
    onError: (error: any) => {
      // Обрабатываем объекты ошибок валидации
      let message = "Ошибка при обновлении статуса визита";

      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;

        // Проверяем, является ли detail объектом или массивом
        if (typeof detail === "object" && detail !== null) {
          if (Array.isArray(detail)) {
            // Если это массив ошибок
            message = detail
              .map((err) => {
                if (typeof err === "string") return err;
                return err.msg || JSON.stringify(err);
              })
              .join(", ");
          } else if (detail.msg) {
            // Если это объект с полем msg
            message = detail.msg;
          } else {
            // Пробуем преобразовать объект в строку
            try {
              message = JSON.stringify(detail);
            } catch (e) {
              message = "Неизвестная ошибка валидации";
            }
          }
        } else if (typeof detail === "string") {
          // Если это просто строка
          message = detail;
        }
      }

      setErrorMessage(message);
      setConfirmDialogOpen(false);
    },
  });

  const handleFieldChange = (field: string, value: any) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDynamicFieldChange = (fieldName: string, value: any) => {
    setFormState((prev) => {
      const updatedDynamicFields = {
        ...(prev.dynamic_fields || {}),
        [fieldName]: value,
      };

      if (fieldName === "1732026275473") {
        updatedDynamicFields["1732026990932"] = value.split("T")[0];
        updatedDynamicFields["date"] = value;
        formState.date = value;
      }
      return {
        ...prev,
        dynamic_fields: updatedDynamicFields,
      };
    });
  };

  function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const timezoneOffset = -date.getTimezoneOffset();
    const offsetHours = String(
      Math.floor(Math.abs(timezoneOffset) / 60)
    ).padStart(2, "0");
    const offsetMinutes = String(Math.abs(timezoneOffset) % 60).padStart(
      2,
      "0"
    );
    const offsetSign = timezoneOffset >= 0 ? "+" : "-";
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
  }

  const handleSubmit = (stayInEditMode: boolean = false) => {
    if (!formState || !id) return;

    const visitData: VisitInput = {
      company_id: formState.company_id!,
      doctor_ids: formState.doctor_ids || [],
      dynamic_fields: { ...formState.dynamic_fields },
      date: formState.date
        ? formatLocalDate(new Date(formState.date))
        : formatLocalDate(new Date()),
    };

    setIsSaving(true);

    updateVisitMutation.mutate(visitData, {
      onSuccess: () => {
        if (!stayInEditMode) {
          setIsEditing(false);
        }
        setIsSaving(false);
      },
      onError: (error) => {
        setFormError(`Ошибка при сохранении визита: ${String(error)}`);
        setIsSaving(false);
      },
    });
  };

  // Handle status update
  const handleStatusUpdate = () => {
    if (!id || !statusToUpdate) return;

    // First save the form data
    if (formState) {
      const visitData: VisitInput = {
        company_id: formState.company_id!,
        doctor_ids: formState.doctor_ids || [],
        dynamic_fields: formState.dynamic_fields || {},
        // Добавляем поле date как обязательное свойство
        date: formState.date || new Date().toISOString(),
      };

      // Обрабатываем дату особым образом
      if (formState.date) {
        // Также добавляем дату в динамические поля
        if (visitData.dynamic_fields) {
          visitData.dynamic_fields.date = formState.date;
        }
      }

      // Save data first, then update status
      updateVisitMutation.mutate(visitData, {
        onSuccess: () => {
          // After saving, update the status
          updateStatusMutation.mutate({
            id: Number(id),
            status: statusToUpdate,
          });
        },
        onError: (error) => {
          setFormError(
            `Ошибка при сохранении визита перед обновлением статуса ${String(
              error
            )}`
          );
          setConfirmDialogOpen(false);
        },
      });
    } else {
      // If no form data to save, just update status
      updateStatusMutation.mutate({ id: Number(id), status: statusToUpdate });
    }
  };

  // Open confirmation dialog
  const openConfirmDialog = (status: "success" | "fail") => {
    setStatusToUpdate(status);
    setConfirmDialogOpen(true);
  };

  // Все поля теперь обрабатываются через компонент DynamicFields
  // Это позволяет единообразно отображать и редактировать данные для визитов, клиник и врачей

  // Render loading state
  if (isLoading || !visit) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        py={8}
        sx={{
          height: "calc(100vh - 120px)",
          minHeight: "300px",
        }}
      >
        <CircularProgress size={40} thickness={4} />
        <Typography variant="h6" mt={3} color="text.secondary" fontWeight={500}>
          Загрузка визита...
        </Typography>
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">
          Ошибка при загрузке данных визита. Пожалуйста, попробуйте еще раз.
        </Alert>
        <Button
          variant="outlined"
          onClick={() => navigate("/visits")}
          sx={{ mt: 2 }}
          startIcon={<ArrowBackIcon />}
        >
          Вернуться к списку визитов
        </Button>
      </Box>
    );
  }

  // Render not found state
  if (!visit) {
    return (
      <Box p={3}>
        <Alert severity="warning">Визит не найден</Alert>
        <Button
          variant="outlined"
          onClick={() => navigate("/visits")}
          sx={{ mt: 2 }}
          startIcon={<ArrowBackIcon />}
        >
          Вернуться к списку визитов
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: "100%",
        overflow: "hidden",
        pb: 10,
        bgcolor: "background.default",
        minHeight: "100%",
      }}
    >
      {errorMessage && (
        <Alert
          severity="error"
          sx={{
            mb: 3,
            borderRadius: 1.5,
            boxShadow: 2,
            "& .MuiAlert-icon": {
              alignItems: "center",
            },
            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
            animation: "shake 0.5s ease-in-out",
            "@keyframes shake": {
              "0%, 100%": { transform: "translateX(0)" },
              "10%, 30%, 50%, 70%, 90%": { transform: "translateX(-2px)" },
              "20%, 40%, 60%, 80%": { transform: "translateX(2px)" },
            },
          }}
          onClose={() => setErrorMessage(null)}
        >
          {errorMessage}
        </Alert>
      )}
      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 4,
            maxWidth: isMobile ? "90%" : "500px",
            padding: isMobile ? 1 : 2,
            overflow: "hidden",
          },
        }}
        TransitionComponent={Grow}
        TransitionProps={{
          timeout: 300,
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            bgcolor:
              statusToUpdate === "success"
                ? theme.palette.primary.main
                : theme.palette.secondary.main,
          }}
        />
        <DialogTitle
          sx={{
            pb: 1,
            pt: 2,
            fontWeight: 600,
            color:
              statusToUpdate === "success"
                ? theme.palette.primary.main
                : theme.palette.secondary.main,
          }}
        >
          Подтвердите действие
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: "text.primary", my: 1 }}>
            Вы точно хотите сохранить изменения и{" "}
            {statusToUpdate === "success"
              ? "синхронизировать их с Bitrix24"
              : "сохранить их только локально"}
            ?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button
            onClick={() => setConfirmDialogOpen(false)}
            color="inherit"
            variant="outlined"
            sx={{
              borderRadius: 1.5,
              px: 2,
              textTransform: "none",
              fontWeight: 500,
            }}
          >
            Отмена
          </Button>
          <Button
            onClick={handleStatusUpdate}
            color={statusToUpdate === "success" ? "primary" : "secondary"}
            variant="contained"
            startIcon={
              statusToUpdate === "success" ? <SyncIcon /> : <SaveIcon />
            }
            disabled={isSaving}
            sx={{
              borderRadius: 1.5,
              px: 2,
              ml: 1,
              textTransform: "none",
              fontWeight: 500,
              position: "relative",
            }}
          >
            {isSaving ? (
              <>
                <CircularProgress
                  size={24}
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    marginTop: "-12px",
                    marginLeft: "-12px",
                  }}
                />
                <span style={{ visibility: "hidden" }}>
                  {statusToUpdate === "success"
                    ? "Синхронизировать"
                    : "Сохранить"}
                </span>
              </>
            ) : statusToUpdate === "success" ? (
              "Синхронизировать"
            ) : (
              "Сохранить"
            )}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Диалог создания задачи */}
      <CreateTaskDialog
        open={taskDialogOpen}
        visitId={visit.id}
        bitrixId={Number(visit.company.bitrix_id)}
        visitDate={visit.date}
        managers={[]}
        onClose={() => setTaskDialogOpen(false)}
        onSave={handleSaveTask}
      />
      <Box
        sx={{
          px: 1,
          pt: 1,
          pb: 1,
          display: "flex",
          position: "sticky",
          top: 0,
          zIndex: 100,
          bgcolor: "background.paper",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          mb: 2,
          alignItems: "center",
        }}
      >
        <IconButton
          onClick={() => navigate("/visits")}
          sx={{ color: "primary.main" }}
        >
          <ChevronLeftIcon fontSize="large" />
        </IconButton>
        <Typography
          variant="h6"
          component="h1"
          noWrap
          sx={{
            fontWeight: 600,
            flexGrow: 1,
          }}
        >
          Редактирование визита
        </Typography>
        <Box sx={{ width: 48 }} /> {/* Placeholder to balance flex */}
      </Box>

      <Grid container spacing={isMobile ? 0 : 2} sx={{ px: isMobile ? 2 : 3, maxWidth: 1000, mx: "auto" }}>
        <Grid item xs={12} md={8}>
          <Card
            variant="outlined"
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 3,
              border: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <Box
              display="flex"
              flexDirection={isMobile ? "column" : "row"}
              justifyContent="space-between"
              alignItems="flex-start"
              mb={isMobile ? 3 : 2}
              gap={isMobile ? 2 : 0}
            >
              <Box>
                <Typography
                  variant={isMobile ? "subtitle1" : "h6"}
                  sx={{
                    fontWeight: 500,
                    color: theme.palette.primary.main,
                    mb: 0.5,
                  }}
                >
                  {visit.company.name}
                </Typography>
                <Box
                  display="flex"
                  alignItems="center"
                  mt={0.5}
                  flexWrap="wrap"
                  gap={1}
                >
                  {visit.sync_status === "synced" ? (
                    <Tooltip title="Синхронизировано с Bitrix24">
                      <SyncIcon
                        color="success"
                        fontSize="small"
                        sx={{ mr: 0.5 }}
                      />
                    </Tooltip>
                  ) : (
                    <Tooltip
                      title={
                        visit.sync_status === "error"
                          ? "Ошибка синхронизации"
                          : "Не синхронизировано с Bitrix24"
                      }
                    >
                      <SyncProblemIcon
                        color="warning"
                        fontSize="small"
                        sx={{ mr: 0.5 }}
                      />
                    </Tooltip>
                  )}
                  {visit.bitrix_id && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        bgcolor:
                          theme.palette.mode === "dark"
                            ? alpha(theme.palette.primary.main, 0.1)
                            : theme.palette.action.hover,
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        border: `1px solid ${alpha(
                          theme.palette.divider,
                          0.5
                        )}`,
                      }}
                    >
                      ID: {visit.bitrix_id}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Box
                display="flex"
                flexDirection="row"
                justifyContent="flex-end"
                alignItems="center"
                gap={1}
                width="auto"
                mt={isMobile ? 1 : 0}
                flexWrap="wrap"
              >
                <Button
                  variant="contained"
                  color="primary"
                  size={isMobile ? "small" : "medium"}
                  onClick={() => handleSubmit(true)}
                  sx={{
                    borderRadius: 1.5,
                    textTransform: "none",
                    boxShadow: isMobile ? 1 : 2,
                    transition: "all 0.2s ease",
                    minWidth: isMobile ? "40px" : "48px",
                    marginLeft: 1,
                    marginRight: 1,
                    padding: isMobile ? "8px" : "8px 16px",
                    "&:hover": {
                      boxShadow: 4,
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  <SaveIcon />
                </Button>
                <Button
                  variant="contained"
                  color="info"
                  size={isMobile ? "small" : "medium"}
                  onClick={() => setTaskDialogOpen(true)}
                  sx={{
                    borderRadius: 1.5,
                    textTransform: "none",
                    boxShadow: isMobile ? 1 : 2,
                    transition: "all 0.2s ease",
                    minWidth: isMobile ? "40px" : "48px",
                    marginLeft: 1,
                    marginRight: 1,
                    padding: isMobile ? "8px" : "8px", // Уменьшите padding, если нужно
                    display: "flex", // Добавляем flex для центрирования
                    justifyContent: "center", // Центрируем содержимое
                    alignItems: "center", // Вертикальное центрирование
                    "&:hover": {
                      boxShadow: 4,
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  <AssignmentIcon />
                </Button>

                <Button
                  variant="contained"
                  color="success"
                  size={isMobile ? "small" : "medium"}
                  onClick={() => buildRoute()}
                  sx={{
                    borderRadius: 1.5,
                    textTransform: "none",
                    boxShadow: isMobile ? 1 : 2,
                    transition: "all 0.2s ease",
                    minWidth: isMobile ? "40px" : "48px",
                    marginLeft: 1,
                    marginRight: 1,
                    padding: isMobile ? "8px" : "8px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    "&:hover": {
                      boxShadow: 4,
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  <MapOutlined />
                </Button>

                {/* Кнопка "Состоялся" отображается только если статус не "completed" и не "failed" */}
                {formState.status !== "completed" &&
                  formState.status !== "failed" && (
                    <Button
                      variant="contained"
                      color="success"
                      size={isMobile ? "small" : "medium"}
                      onClick={() => openConfirmDialog("success")}
                      sx={{
                        borderRadius: 1.5,
                        textTransform: "none",
                        boxShadow: isMobile ? 1 : 2,
                        transition: "all 0.2s ease",
                        minWidth: isMobile ? "40px" : "48px",
                        marginLeft: 1,
                        marginRight: 1,
                        padding: isMobile ? "8px" : "8px", // Уменьшите padding, если нужно
                        display: "flex", // Добавляем flex для центрирования
                        justifyContent: "center", // Центрируем содержимое
                        alignItems: "center", // Вертикальное центрирование
                        "&:hover": {
                          boxShadow: 4,
                          transform: "translateY(-1px)",
                        },
                      }}
                    >
                      <ThumbUpIcon />
                    </Button>
                  )}
                {/* Кнопка "Провалился" отображается только если статус не "completed" и не "failed" */}
                {formState.status !== "completed" &&
                  formState.status !== "failed" && (
                    <Button
                      variant="contained"
                      color="error"
                      size={isMobile ? "small" : "medium"}
                      onClick={() => openConfirmDialog("fail")}
                      sx={{
                        borderRadius: 1.5,
                        textTransform: "none",
                        boxShadow: isMobile ? 1 : 2,
                        transition: "all 0.2s ease",
                        minWidth: isMobile ? "40px" : "48px",
                        marginLeft: 1,
                        marginRight: 1,
                        padding: isMobile ? "8px" : "8px 16px",
                        "&:hover": {
                          boxShadow: 4,
                          transform: "translateY(-1px)",
                        },
                      }}
                    >
                      <ThumbDownIcon />
                    </Button>
                  )}
              </Box>
            </Box>

            <Divider sx={{ my: 1, opacity: 0.6 }} />
            <Grid
              container
              spacing={isMobile ? 1 : 1}
              sx={{
                mr: 0,
                ml: 0,
                px: 0, // Убираем горизонтальные отступы
                justifyContent: "center", // Центрируем содержимое
                // Улучшаем отображение контейнера на мобильных устройствах
                ...(isMobile && {
                  "& .MuiFormControl-root": {
                    // Полная ширина для полей ввода
                    width: "100%",
                    // Равномерные отступы для полей ввода
                    //mx: 'auto',
                    p: 0,
                  },
                  "& .MuiGrid-item": {
                    // Снижаем вертикальные отступы
                    py: 0.5,
                    px: 0,
                  },
                }),
              }}
            >
              {isEditing ? (
                <DynamicFields
                  entityType="visit"
                  formData={{
                    ...Object.entries(formState.dynamic_fields || {}).reduce(
                      (obj, [key, value]) => {
                        obj[`dynamic_${key}`] = value;
                        return obj;
                      },
                      {} as Record<string, any>
                    ),
                    dynamic_date:
                      formState.date?.toString().substring(0, 10) || "",
                  }}
                  onChange={(fieldName, value) => {
                    const isVisitCompletedOrFailed =
                      visit.status === "completed" || visit.status === "failed";
                    const isDateField =
                      fieldName === "dynamic_date" ||
                      fieldName === "dynamic_1732026275473" ||
                      fieldName === "dynamic_ufCrm18_1732026275473";

                    if (isDateField && isVisitCompletedOrFailed) {
                      console.log("Нельзя изменить дату завершенного визита");
                      return;
                    }
                    if (fieldName === "dynamic_date") {
                      handleFieldChange("date", value);
                    } else {
                      const key = fieldName.replace("dynamic_", "");
                      handleDynamicFieldChange(key, value);
                    }
                  }}
                  gridSize={{ xs: 10, md: isMobile ? 12 : 10 }}
                  // Disable date field if visit is completed, failed, or cancelled
                  disabledFields={{
                    dynamic_date:
                      visit.status === "completed" ||
                      visit.status === "failed" ||
                      visit.status === "cancelled",
                  }}
                />
              ) : (
                <Grid container spacing={1}>
                  {/* Date field */}
                  <Grid item xs={12} sm={12}>
                    <Box
                      display="flex"
                      alignItems="center"
                      mb={1}
                      sx={{
                        bgcolor:
                          theme.palette.mode === "dark"
                            ? alpha(theme.palette.primary.main, 0.1)
                            : theme.palette.background.default,
                        p: 1,
                        borderRadius: 1,
                        border: `1px solid ${alpha(
                          theme.palette.divider,
                          0.5
                        )}`,
                      }}
                    >
                      <CalendarIcon color="primary" sx={{ mr: 1 }} />
                      <Typography color="textSecondary">Дата визита</Typography>
                    </Box>
                    <Typography
                      variant="body1"
                      sx={{
                        p: 1,
                        fontSize: "1rem",
                        fontWeight: 500,
                      }}
                    >
                      {new Date(visit.date).toLocaleDateString("ru-RU")}
                    </Typography>
                  </Grid>

                  {/* Dynamic fields */}
                  {visit.dynamic_fields &&
                    Object.entries(visit.dynamic_fields)
                      .filter(([key]) => key !== "Ufcrm18comment") // Filter out comment field
                      .map(([key, value]) => (
                        <Grid item xs={12} sm={6} key={key}>
                          <Box
                            sx={{
                              bgcolor:
                                theme.palette.mode === "dark"
                                  ? alpha(theme.palette.primary.main, 0.1)
                                  : theme.palette.background.default,
                              p: 0,
                              borderRadius: 1,
                              mb: 0,
                              border: `1px solid ${alpha(
                                theme.palette.divider,
                                0.5
                              )}`,
                            }}
                          >
                            <Typography color="textSecondary">
                              {getFieldDisplayName("visit", key)}
                            </Typography>
                          </Box>
                          <Typography
                            variant="body1"
                            sx={{
                              p: 0,
                              fontSize: "1rem",
                              fontWeight: 500,
                            }}
                          >
                            {typeof value === "boolean"
                              ? value
                                ? "Да"
                                : "Нет"
                              : String(value) || "Не указано"}
                          </Typography>
                        </Grid>
                      ))}

                  {/* Comment field */}
                  {visit.dynamic_fields?.Ufcrm18comment && (
                    <Grid item xs={12} sx={{ mt: 2 }}>
                      <Box
                        sx={{
                          bgcolor:
                            theme.palette.mode === "dark"
                              ? alpha(theme.palette.primary.main, 0.1)
                              : theme.palette.background.default,
                          p: 1,
                          borderRadius: 1,
                          mb: 1,
                          border: `1px solid ${alpha(
                            theme.palette.divider,
                            0.5
                          )}`,
                        }}
                      >
                        <Typography color="textSecondary">
                          {getFieldDisplayName("visit", "Ufcrm18comment")}
                        </Typography>
                      </Box>
                      <Typography
                        variant="body1"
                        sx={{
                          p: 1,
                          fontSize: "1rem",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {visit.dynamic_fields.Ufcrm18comment}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              )}
            </Grid>
          </Card>

          <Card
            variant="outlined"
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 3,
              border: "none",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={2}
              flexWrap={isMobile ? "wrap" : "nowrap"}
              gap={isMobile ? 1 : 0}
            >
              <Typography
                variant={isMobile ? "subtitle1" : "h6"}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  fontWeight: 500,
                }}
              >
                <BusinessIcon
                  sx={{ mr: 1, color: theme.palette.primary.main }}
                />
                Информация о компании
              </Typography>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/companies/${visit.company.id}/edit`)}
                size={isMobile ? "small" : "medium"}
                sx={{
                  borderRadius: 1.5,
                  textTransform: "none",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    transform: "translateY(-1px)",
                  },
                }}
              >
                Редактировать
              </Button>
            </Box>

            <Divider sx={{ mb: 2, opacity: 0.6 }} />

            {routeUrl && (
              <Snackbar
                open={!!routeUrl}
                autoHideDuration={6000}
                onClose={() => setRouteUrl(null)}
                anchorOrigin={{ vertical: "top", horizontal: "center" }}
              >
                <Alert
                  severity="info"
                  variant="filled"
                  sx={{ width: "100%" }}
                  action={
                    <Button
                      color="inherit"
                      size="small"
                      href={routeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setRouteUrl(null)}
                    >
                      Открыть
                    </Button>
                  }
                >
                  <AlertTitle>Маршрут построен</AlertTitle>
                  Нажмите «Открыть», чтобы перейти в Яндекс.Карты.
                </Alert>
              </Snackbar>
            )}

            {/* Company details */}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    display: "flex",
                    flexDirection: "column",
                    transition: "all 0.2s ease",
                    height: "100%",
                    overflow: "hidden",
                    "&:hover": {
                      boxShadow: 2,
                    },
                  }}
                >
                  <CardContent
                    sx={{
                      p: isMobile ? 1.5 : 2,
                      flexGrow: 1,
                      pb: "16px !important",
                    }}
                  >
                    <Typography>
                      {getClinicAddress(visit.company) || "Адрес не указан"}
                    </Typography>
                    {visit.company.city && (
                      <Typography
                        color="text.secondary"
                        variant="body2"
                        sx={{ mt: 1 }}
                      >
                        г. {visit.company.city}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    display: "flex",
                    flexDirection: "column",
                    transition: "all 0.2s ease",
                    height: "100%",
                    overflow: "hidden",
                    "&:hover": {
                      boxShadow: 2,
                    },
                  }}
                >
                  <CardContent
                    sx={{
                      p: isMobile ? 1.5 : 2,
                      flexGrow: 1,
                      pb: "16px !important",
                    }}
                  >
                    <Typography>{visit.company.name}</Typography>
                    {visit.company.dynamic_fields?.inn && (
                      <Typography
                        color="text.secondary"
                        variant="body2"
                        sx={{ mt: 1 }}
                      >
                        ИНН: {visit.company.dynamic_fields.inn}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            variant="outlined"
            sx={{
              p: isMobile ? 2 : 3,
              mb: isMobile ? 2 : 3,
              borderRadius: isMobile ? 1 : 2,
              position: "sticky",
              top: isMobile ? "72px" : "80px",
              transition: "all 0.2s ease",
              "&:hover": {
                boxShadow: 4,
              },
            }}
          >
            <Typography
              variant={isMobile ? "subtitle1" : "h6"}
              gutterBottom
              sx={{
                display: "flex",
                alignItems: "center",
                fontWeight: 500,
              }}
            >
              <PersonIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              Контакты
            </Typography>

            <Divider sx={{ mb: 2, opacity: 0.6 }} />

            {isContactsLoading ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                my={3}
                sx={{
                  height: "150px",
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? alpha(theme.palette.primary.main, 0.05)
                      : theme.palette.background.default,
                  borderRadius: 1.5,
                }}
              >
                <CircularProgress size={28} color="primary" />
              </Box>
            ) : contacts && contacts.length > 0 ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(auto-fill, minmax(250px, 1fr))",
                  gap: 2,
                }}
              >
                {contacts.map((contact) => (
                  <Card
                    key={contact.id}
                    variant="outlined"
                    sx={{
                      borderRadius: 1.5,
                      transition: "all 0.3s ease",
                      position: "relative",
                      overflow: "hidden",
                      "&:hover": {
                        boxShadow: 4,
                        transform: "translateY(-2px)",
                      },
                      "&:after": {
                        content: '""',
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "5px",
                        height: "100%",
                        backgroundColor: theme.palette.primary.main,
                        opacity: 0.7,
                      },
                    }}
                  >
                    <CardContent>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 500,
                          mb: 0.5,
                          color: theme.palette.primary.main,
                        }}
                      >
                        {contact.name}
                      </Typography>
                      {contact.position && (
                        <Typography
                          color="textSecondary"
                          variant="body2"
                          sx={{ mb: 1.5 }}
                        >
                          {contact.position}
                        </Typography>
                      )}
                      <Divider sx={{ my: 1.5, opacity: 0.4 }} />
                      <Box sx={{ mt: 1.5 }}>
                        {contact.phone && (
                          <Box
                            display="flex"
                            alignItems="center"
                            mb={1}
                            sx={{
                              bgcolor:
                                theme.palette.mode === "dark"
                                  ? alpha(theme.palette.background.paper, 0.3)
                                  : theme.palette.background.default,
                              p: 1,
                              borderRadius: 1,
                              fontSize: "0.875rem",
                              border: `1px solid ${alpha(
                                theme.palette.divider,
                                0.5
                              )}`,
                            }}
                          >
                            <PhoneIcon
                              fontSize="small"
                              color="primary"
                              sx={{ mr: 1 }}
                            />
                            <Typography
                              variant="body2"
                              component="a"
                              href={`tel:${contact.phone}`}
                              sx={{
                                textDecoration: "none",
                                color: theme.palette.text.primary,
                                "&:hover": {
                                  textDecoration: "underline",
                                  color: theme.palette.primary.main,
                                },
                              }}
                            >
                              {contact.phone}
                            </Typography>
                          </Box>
                        )}
                        {contact.email && (
                          <Box
                            display="flex"
                            alignItems="center"
                            sx={{
                              bgcolor:
                                theme.palette.mode === "dark"
                                  ? alpha(theme.palette.background.paper, 0.3)
                                  : theme.palette.background.default,
                              p: 1,
                              borderRadius: 1,
                              fontSize: "0.875rem",
                              border: `1px solid ${alpha(
                                theme.palette.divider,
                                0.5
                              )}`,
                            }}
                          >
                            <EmailIcon
                              fontSize="small"
                              color="primary"
                              sx={{ mr: 1 }}
                            />
                            <Typography
                              variant="body2"
                              noWrap
                              component="a"
                              href={`mailto:${contact.email}`}
                              sx={{
                                textDecoration: "none",
                                color: theme.palette.text.primary,
                                "&:hover": {
                                  textDecoration: "underline",
                                  color: theme.palette.primary.main,
                                },
                              }}
                            >
                              {contact.email}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              <Box
                sx={{
                  py: 4,
                  px: 2,
                  textAlign: "center",
                  bgcolor:
                    theme.palette.mode === "dark"
                      ? alpha(theme.palette.background.paper, 0.2)
                      : theme.palette.background.default,
                  borderRadius: 1.5,
                  border: `1px dashed ${alpha(theme.palette.divider, 0.7)}`,
                }}
              >
                <Typography color="text.secondary">
                  Контакты не найдены для данной компании
                </Typography>
              </Box>
            )}
          </Card>

          {/* Add a button at the bottom for better mobile usage */}
          {isMobile && (
            <Box
              sx={{
                position: "fixed",
                bottom: 16,
                right: 16,
                zIndex: 10,
              }}
            >
              <Fab
                color="primary"
                onClick={() => handleSubmit(true)}
                sx={{
                  boxShadow: 3,
                  "&:hover": {
                    boxShadow: 6,
                  },
                }}
              >
                <SaveIcon />
              </Fab>
            </Box>
          )}
        </Grid>
      </Grid>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};
