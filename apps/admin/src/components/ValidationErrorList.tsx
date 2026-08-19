interface ValidationErrorListProps {
  errors: string[];
}

export function ValidationErrorList({ errors }: ValidationErrorListProps) {
  if (errors.length === 0) return null;

  return (
    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="font-medium text-red-800 mb-2">Validation Errors</p>
      <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
        {errors.map((err, i) => (
          <li key={i}>{err}</li>
        ))}
      </ul>
    </div>
  );
}
