import { Match, mergeProps, Show, Switch } from "solid-js";
import {
	type DescriptionFormatted,
	DescriptionOptions,
} from "./DescriptionOption";
import { Note, type NoteType } from "./Note";

interface SelectionOptionProps {
	checked: boolean;
	description: string | DescriptionFormatted;
	setChecked: (checked: boolean) => void;
	align?: boolean;
	note?: NoteType;
}

export function CheckboxOption(props: SelectionOptionProps) {
	const finalProps = mergeProps({ align: true }, props);
	return (
		<>
			<input
				classList={{
					"size-4 shrink-0 mr-2 accent-blue-600 dark:accent-blue-400": true,
					"mt-[3px]": finalProps.align,
				}}
				type="checkbox"
				checked={finalProps.checked}
				onChange={(e) => {
					finalProps.setChecked(e.currentTarget.checked);
				}}
			/>
			<div>
				<div>
					<Switch>
						<Match when={typeof finalProps.description === "string"}>
							{finalProps.description as unknown as string}
						</Match>
						<Match when={Array.isArray(finalProps.description)}>
							<DescriptionOptions
								formatted={
									finalProps.description as unknown as DescriptionFormatted
								}
							/>
						</Match>
					</Switch>
				</div>
				<Show when={finalProps.note !== undefined}>
					{/** biome-ignore lint/style/noNonNullAssertion: just checked */}
					<Note notes={finalProps.note!} />
				</Show>
			</div>
		</>
	);
}
