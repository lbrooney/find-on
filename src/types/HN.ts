export interface HNHits {
	exhaustive: Exhaustive;
	exhaustiveNbHits: boolean;
	exhaustiveTypo: boolean;
	hits: HNHit[];
	hitsPerPage: number;
	nbHits: number;
	nbPages: number;
	page: number;
	params: string;
	processingTimeMS: number;
	processingTimingsMS: ProcessingTimingsMS;
	query: string;
	serverTimeMS: number;
}

export interface Exhaustive {
	nbHits: boolean;
	typo: boolean;
}

export interface HNHit {
	_highlightResult: HighlightResult;
	_tags: string[];
	author: string;
	children: number[];
	created_at: Date;
	created_at_i: number;
	num_comments: number;
	objectID: string;
	points: number;
	story_id: number;
	title: string;
	updated_at: Date;
	url: string;
}

export interface HighlightResult {
	author: Author;
	title: Author;
	url: Author;
}

export interface Author {
	matchLevel: "full" | "none";
	matchedWords: string[];
	value: string;
	fullyHighlighted?: boolean;
}

export interface ProcessingTimingsMS {
	_request: Request;
	fetch: Fetch;
	total: number;
}

export interface Request {
	roundTrip: number;
}

export interface Fetch {
	query: number;
	scanning: number;
	total: number;
}
