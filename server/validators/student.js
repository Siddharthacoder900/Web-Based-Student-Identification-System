import { z } from 'zod'

const studentFields = {
  fullName: z.string().trim().min(1).max(160),
  enrollmentNumber: z.string().trim().min(1).max(40).transform(value => value.toUpperCase()),
  email: z.union([z.literal(''), z.string().trim().email().max(254)]),
  mobileNumber: z.string().trim().max(30),
  course: z.string().trim().min(1).max(80),
  branch: z.string().trim().min(1).max(120),
  currentSemester: z.union([z.literal(''), z.coerce.number().int().min(1).max(20)]),
  admissionYear: z.union([z.literal(''), z.coerce.number().int().min(1900).max(2200)]),
  studentStatus: z.enum(['Active', 'Inactive']).optional(),
}

export const createStudentSchema = z.object({
  fullName: studentFields.fullName,
  enrollmentNumber: studentFields.enrollmentNumber,
  email: studentFields.email.optional().default(''),
  mobileNumber: studentFields.mobileNumber.optional().default(''),
  course: studentFields.course,
  branch: studentFields.branch,
  currentSemester: studentFields.currentSemester.optional().transform(value => value === '' || value === undefined ? null : value),
  admissionYear: studentFields.admissionYear.optional().transform(value => value === '' || value === undefined ? null : value),
})
const updateFields = Object.fromEntries(
  Object.entries(studentFields).map(([key, schema]) => [key, schema.optional()]),
)
updateFields.currentSemester = studentFields.currentSemester.optional().transform(value => value === '' ? null : value)
updateFields.admissionYear = studentFields.admissionYear.optional().transform(value => value === '' ? null : value)

export const updateStudentSchema = z.object(updateFields)
  .refine(value => Object.values(value).some(item => item !== undefined), 'At least one student field is required.')
