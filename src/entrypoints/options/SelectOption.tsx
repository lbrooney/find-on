import { For, Match, Switch } from "solid-js";

import type { JSX } from "solid-js/jsx-runtime";
import {
	type DescriptionFormatted,
	DescriptionOptions,
} from "./DescriptionOption";

interface SelectionOptionProps<T extends string | number | string[] | undefined> {
	options: [value: T, text?: string][];
	value: T;
	description: string | DescriptionFormatted;
	onChange: JSX.ChangeEventHandlerUnion<HTMLSelectElement, Event>
}

export function SelectOption<T extends string | number | string[] | undefined>(
	props: SelectionOptionProps<T>,
) {
	return (
		<>
			<div class="flex-shrink-0">
				<Switch>
					<Match when={typeof props.description === "string"}>
						{props.description as unknown as string}
					</Match>
					<Match when={Array.isArray(props.description)}>
						<DescriptionOptions
							formatted={props.description as unknown as DescriptionFormatted}
						/>
					</Match>
				</Switch>
			</div>
			<select
				class={
					"block rounded border border-solid px-3 py-1.5 text-base leading-normal shadow-sm transition-colors " +
					"bg-white text-gray-700 hover:bg-gray-50 " +
					"dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 " +
					"mx-2 border-gray-400 dark:border-gray-600"
				}
				value={props.value}
				onChange={props.onChange}
			>
				<For each={props.options}>
					{(option) => (
						<option value={option[0]}>{option[1] ?? `${option[0]}`}</option>
					)}
				</For>
			</select>
		</>
	);
}
