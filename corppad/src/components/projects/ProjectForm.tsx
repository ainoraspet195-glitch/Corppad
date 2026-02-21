import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/ui/Button'

interface Props {
  action: (formData: FormData) => Promise<void>
  defaultValues?: { name?: string; description?: string | null }
  /** Hidden field passed back to the server action for edits */
  projectId?: string
  error?: string
  submitLabel?: string
  cancelHref: string
}

export function ProjectForm({
  action,
  defaultValues,
  projectId,
  error,
  submitLabel = 'Save',
  cancelHref,
}: Props) {
  return (
    <form action={action} className="space-y-5">
      {projectId && (
        <input type="hidden" name="id" value={projectId} />
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Input
        label="Project name"
        id="name"
        name="name"
        type="text"
        required
        defaultValue={defaultValues?.name ?? ''}
        placeholder="My project"
      />

      <Textarea
        label="Description"
        id="description"
        name="description"
        rows={3}
        defaultValue={defaultValues?.description ?? ''}
        placeholder="Optional short description"
      />

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit">{submitLabel}</Button>
        <Link
          href={cancelHref}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
        >
          Cancel
        </Link>
      </div>
    </form>
  )
}
