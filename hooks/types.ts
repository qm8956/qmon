export interface ResponseData<T> {
	code: string;
	msg: string;
	data: T;
}

export interface PagedList<T> {
	list: T[];
	total: number;
}
