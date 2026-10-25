// Compile-only check (run by `npm run typecheck:tests`): a typed useForm result must be accepted
// by ErrorSummary and SaveBar. It once was not, because FormApi's methods only take V's own names.
import { ErrorSummary, SaveBar, useForm } from "../../src/index";

export function TypedFormFits() {
  const form = useForm({ initialValues: { name: "", port: 9110 }, onSubmit: async () => {} });
  return (
    <>
      <ErrorSummary form={form} />
      <SaveBar form={form} />
    </>
  );
}
