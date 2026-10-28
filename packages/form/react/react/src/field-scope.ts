import { concatenatePaths } from '@tanstack/form-core'

type ListenTo = readonly string[] | undefined

type ScopableValidators = { onChangeListenTo?: ListenTo; onBlurListenTo?: ListenTo }

/**
 * A field's props with every name in them read relative to `prefix` — `name`, and the
 * `onChangeListenTo` / `onBlurListenTo` lists of its TanStack `validators`, which name sibling
 * fields. It is what TanStack's own `FieldGroupApi.getFormFieldOptions` does for a field group;
 * a form group and an array entry scope their fields with this. Paths are joined with TanStack's
 * `concatenatePaths`, so `[0].label` under `tags` is `tags[0].label`.
 */
export function scopeFieldProps<TProps extends { name: string }>(props: TProps, prefix: string): TProps {
	const scoped = { ...props, name: concatenatePaths(prefix, props.name) }
	const validators = (props as { validators?: ScopableValidators }).validators
	if (validators?.onChangeListenTo === undefined && validators?.onBlurListenTo === undefined) return scoped
	const remap = (listenTo: ListenTo): string[] | undefined => listenTo?.map((name) => concatenatePaths(prefix, name))
	return {
		...scoped,
		validators: {
			...validators,
			onChangeListenTo: remap(validators.onChangeListenTo),
			onBlurListenTo: remap(validators.onBlurListenTo),
		},
	}
}
