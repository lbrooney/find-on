import { Match, mergeProps, Show, Switch } from "solid-js";
import {
	type DescriptionFormatted,
	DescriptionOptions,
} from "./DescriptionOption";
import { Note, type NoteType } from "./Note";

interface CheckboxOptionProps {
	checked: boolean;
	description: string | DescriptionFormatted;
	align?: boolean;
	note?: NoteType;
}

interface SimpleCheckboxOption extends CheckboxOptionProps {
	setSimpleChecked: (checked: boolean) => void;
	type?: "simple";
}

interface ComplexCheckboxOption extends CheckboxOptionProps {
	type: "complex";
	setComplexChecked: (
		e: Event & {
			currentTarget: HTMLInputElement;
			target: HTMLInputElement;
		},
	) => void;
}

export function CheckboxOption(
	props: SimpleCheckboxOption | ComplexCheckboxOption,
) {
	const finalProps = mergeProps({ align: true, type: "simple" }, props);
	return (
		<>
			<input
				checked={finalProps.checked}
				classList={{
					"mt-[3px]": finalProps.align,
					"size-4 shrink-0 mr-2 accent-blue-600 dark:accent-blue-400": true,
				}}
				onChange={(e) => {
					if (finalProps.type === "simple") {
						(finalProps as SimpleCheckboxOption).setSimpleChecked(
							e.target.checked,
						);
					} else if (finalProps.type === "complex") {
						(finalProps as ComplexCheckboxOption).setComplexChecked(e);
					}
				}}
				type="checkbox"
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
