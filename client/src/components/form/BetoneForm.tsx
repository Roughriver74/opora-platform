import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import FormField from './FormField';
import { Form, FormField as FormFieldType } from '../../types';
import { SubmissionService } from '../../services/submissionService';

interface BetonFormProps {
  form: Form;
  fields: FormFieldType[];
}

const BetonForm: React.FC<BetonFormProps> = ({ form, fields }) => {
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Создание схемы валидации на основе полей формы
  const generateValidationSchema = () => {
    const schemaFields: Record<string, any> = {};

    fields.forEach((field) => {
      let fieldSchema;

      switch (field.type) {
        case 'text':
          fieldSchema = yup.string();
          break;
        case 'number':
          fieldSchema = yup.number().typeError('Должно быть числом');
          break;
        case 'select':
        case 'autocomplete':
          fieldSchema = yup.string();
          break;
        case 'checkbox':
          fieldSchema = yup.boolean();
          break;
        case 'radio':
          fieldSchema = yup.string();
          break;
        case 'textarea':
          fieldSchema = yup.string();
          break;
        default:
          fieldSchema = yup.string();
      }

      if (field.required) {
        fieldSchema = fieldSchema.required(`${field.label} - обязательное поле`);
      }

      schemaFields[field.name] = fieldSchema;
    });

    return yup.object().shape(schemaFields);
  };

  // Генерация начальных значений формы
  const generateInitialValues = () => {
    const initialValues: Record<string, any> = {};
    fields.forEach((field) => {
      initialValues[field.name] = '';
    });
    return initialValues;
  };

  const formik = useFormik({
    initialValues: generateInitialValues(),
    validationSchema: generateValidationSchema(),
    onSubmit: async (values) => {
      setSubmitting(true);
      setSubmitResult(null);

      try {
        const response = await SubmissionService.submitForm({
          formId: form._id || '',
          formData: values,
        });

        setSubmitResult({
          success: true,
          message: response.message || 'Форма успешно отправлена!',
        });

        // Сбросить форму после успешной отправки
        formik.resetForm();
      } catch (error: any) {
        setSubmitResult({
          success: false,
          message: error.response?.data?.message || 'Произошла ошибка при отправке формы.',
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <Paper elevation={2} sx={{ padding: 2, marginBottom: 2 }}>
      <Typography variant="h5" component="h1" sx={{ mb: 1 }}>
        {form.title}
      </Typography>

      {form.description && (
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {form.description}
        </Typography>
      )}

      {submitResult && (
        <Alert severity={submitResult.success ? 'success' : 'error'} sx={{ marginBottom: 1.5, py: 0.5 }}>
          {submitResult.message}
        </Alert>
      )}

      <Box component="form" onSubmit={formik.handleSubmit} noValidate sx={{ '& > div': { mb: 1.5 } }}>
        {[...fields]
          .sort((a, b) => (a.order || 0) - (b.order || 0))
          .map((field) => (
            <FormField
              key={field._id || field.name}
              field={field}
              value={formik.values[field.name]}
              onChange={(name, value) => formik.setFieldValue(name, value)}
              error={formik.touched[field.name] ? (formik.errors[field.name] as string) : undefined}
              compact={true}
            />
        ))}

        <Box sx={{ mt: 2 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            size="medium"
            disabled={submitting}
            sx={{ minWidth: '180px', py: 0.75 }}
          >
            {submitting ? <CircularProgress size={20} /> : 'ОТПРАВИТЬ ЗАЯВКУ'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};

export default BetonForm;
