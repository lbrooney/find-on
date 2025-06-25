import { For, Match, Switch } from "solid-js";

type FormatType = { text: string; type: "underline" | "code" };

interface FormattedDescriptionProps {
	format: FormatType;
}

function FormattedDescription(props: FormattedDescriptionProps) {
	return (
		<Switch>
			<Match when={props.format.type === "underline"}>
				<u>{props.format.text}</u>
			</Match>
			<Match when={props.format.type === "code"}>
				<code class="whitespace-nowrap rounded bg-gray-200 px-1 py-0.5 font-mono text-gray-800 dark:bg-gray-700 dark:text-white">
					{props.format.text}
				</code>
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
						when={
							(format as unknown as FormatType).text &&
							(format as unknown as FormatType).type
						}
					>
						<FormattedDescription format={format as unknown as FormatType} />
					</Match>
				</Switch>
			)}
		</For>
	);
}
