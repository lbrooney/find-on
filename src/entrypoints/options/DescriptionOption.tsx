import { For, Match, Switch } from "solid-js";

type FormatType = { text: string; type: "underline" | "code" | "bold" };

interface FormattedDescriptionProps {
	format: FormatType;
}

function FormattedDescription(props: FormattedDescriptionProps) {
	return (
		<Switch fallback={props.format.text}>
			<Match when={props.format.type === "bold"}>
				<b>{props.format.text}</b>
			</Match>
			<Match when={props.format.type === "code"}>
				<code class="whitespace-nowrap rounded bg-gray-300 px-1 py-0.5 font-mono text-gray-800 dark:bg-gray-700 dark:text-white">
					{props.format.text}
				</code>
			</Match>
			<Match when={props.format.type === "underline"}>
				<u>{props.format.text}</u>
			</Match>
		</Switch>
	);
}

export type DescriptionFormatted = (string | FormatType)[];

interface DescriptionProps {
	formatted: DescriptionFormatted;
}

export function DescriptionOptions(props: DescriptionProps) {
	return (
		<For each={props.formatted}>
			{(format) => (
				<Switch>
					<Match when={typeof format === "string"}>
						{format as unknown as string}
					</Match>
					<Match
						when={typeof format !== "string" && format.text && format.type}
					>
						<FormattedDescription format={format as FormatType} />
					</Match>
				</Switch>
			)}
		</For>
	);
}
