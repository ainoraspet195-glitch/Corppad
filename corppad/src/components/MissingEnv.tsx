interface Props {
  missing: string[]
}

export function MissingEnv({ missing }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-red-50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-red-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-red-600">
          Missing environment variables
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          Add these to <code className="font-mono text-xs">.env.local</code> and
          restart the dev server.
        </p>
        <ul className="mt-4 space-y-1">
          {missing.map((v) => (
            <li
              key={v}
              className="rounded bg-red-50 px-3 py-1 font-mono text-xs text-red-700"
            >
              {v}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
