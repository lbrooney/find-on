import { For, Match, Switch } from "solid-js";

import {
	type DescriptionFormatted,
	DescriptionOptions,
} from "./DescriptionOption";

export type NoteType = string | DescriptionFormatted[];

interface NoteProps {
	notes: NoteType;
}

export function Note(props: NoteProps) {
	return (
		<Switch>
			<Match when={typeof props.notes === "string"}>
				<p class="mt-1.5 text-gray-700 text-xs dark:text-gray-400">
					Note: {props.notes as unknown as string}
				</p>
			</Match>
			<Match when={Array.isArray(props.notes) && props.notes.length === 1}>
				<p class="mt-1.5 text-gray-700 text-xs dark:text-gray-400">
					Note:{" "}
					<DescriptionOptions
						formatted={props.notes[0] as DescriptionFormatted}
					/>
				</p>
			</Match>
			<Match when={Array.isArray(props.notes) && props.notes.length > 1}>
				<For each={props.notes as DescriptionFormatted[]}>
					{(note, idx) => (
						<p class="mt-1.5 text-gray-700 text-xs dark:text-gray-400">
							Note {idx() + 1}: <DescriptionOptions formatted={note} />
						</p>
					)}
				</For>
			</Match>
		</Switch>
	);
}
