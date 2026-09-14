import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers';
import {
  appendErrors,
  type FieldError,
  type FieldValues,
  type Resolver,
} from 'react-hook-form';
import { z } from 'zod';

function parseZodIssues(
  issues: z.core.$ZodIssue[],
  validateAllFieldCriteria: boolean,
): Record<string, FieldError> {
  const errors: Record<string, FieldError> = {};

  for (const issue of issues) {
    const path = issue.path.join('.') || 'root';
    const code = issue.code;

    if (!errors[path]) {
      errors[path] = {
        message: issue.message,
        type: code,
      };
    }

    if (validateAllFieldCriteria) {
      const types = errors[path].types;
      const messages = types && types[code];

      errors[path] = appendErrors(
        path,
        validateAllFieldCriteria,
        errors,
        code,
        messages ? ([] as string[]).concat(messages as string[], issue.message) : issue.message,
      ) as FieldError;
    }
  }

  return errors;
}

export function zodSubmitResolver<TFieldValues extends FieldValues>(
  schema: z.ZodType<TFieldValues>,
): Resolver<TFieldValues> {
  return async (values, _context, options) => {
    const result = await schema.safeParseAsync(values);

    if (result.success) {
      if (options.shouldUseNativeValidation) {
        validateFieldsNatively({}, options);
      }

      return {
        values: result.data,
        errors: {},
      };
    }

    return {
      values: {},
      errors: toNestErrors(
        parseZodIssues(
          result.error.issues,
          !options.shouldUseNativeValidation && options.criteriaMode === 'all',
        ),
        options,
      ),
    };
  };
}
