export type HospitalType = 'birth' | 'acute';
export type DataStatus = 'needs-verification';

export interface Hospital {
	id: string;
	name: string;
	city: string;
	lat: number;
	lon: number;
	type: HospitalType;
	status: DataStatus;
}

export const HOSPITAL_DATA_LAST_REVIEWED = '2026-07-29';

const birth = (
	id: string,
	name: string,
	city: string,
	lat: number,
	lon: number
): Hospital => ({ id, name, city, lat, lon, type: 'birth', status: 'needs-verification' });

const acute = (
	id: string,
	name: string,
	city: string,
	lat: number,
	lon: number
): Hospital => ({ id, name, city, lat, lon, type: 'acute', status: 'needs-verification' });

/**
 * Curated planning data, not an official service directory. Birth services can be
 * temporary, seasonal, redirected or reorganised. Every entry must be verified
 * with the hospital before it is used for a journey.
 */
export const hospitals: Hospital[] = [
	birth('hammerfest', 'Hammerfest sykehus', 'Hammerfest', 70.674, 23.677),
	birth('kirkenes', 'Kirkenes sykehus', 'Kirkenes', 69.728, 30.042),
	birth('tromso', 'UNN Tromsø', 'Tromsø', 69.682, 18.987),
	birth('harstad', 'UNN Harstad', 'Harstad', 68.802, 16.53),
	birth('narvik', 'UNN Narvik', 'Narvik', 68.438, 17.427),
	birth('bodo', 'Nordlandssykehuset Bodø', 'Bodø', 67.283, 14.405),
	birth('lofoten', 'Nordlandssykehuset Lofoten', 'Gravdal', 68.121, 13.503),
	birth('stokka', 'Nordlandssykehuset Vesterålen', 'Stokmarknes', 68.568, 14.91),
	birth('mo-rana', 'Helgelandssykehuset Mo i Rana', 'Mo i Rana', 66.312, 14.143),
	birth('sandnessjoen', 'Helgelandssykehuset Sandnessjøen', 'Sandnessjøen', 66.022, 12.63),
	birth('namsos', 'Sykehuset Namsos', 'Namsos', 64.468, 11.494),
	birth('levanger', 'Sykehuset Levanger', 'Levanger', 63.747, 11.29),
	birth('st-olavs', 'St. Olavs hospital', 'Trondheim', 63.42, 10.388),
	birth('alesund', 'Ålesund sjukehus', 'Ålesund', 62.47, 6.316),
	birth('hjelset', 'Sjukehuset Nordmøre og Romsdal', 'Hjelset', 62.779, 7.493),
	birth('volda', 'Volda sjukehus', 'Volda', 62.147, 6.074),
	birth('forde', 'Førde sentralsjukehus', 'Førde', 61.452, 5.857),
	birth('haukeland', 'Haukeland universitetssjukehus', 'Bergen', 60.374, 5.358),
	birth('voss', 'Voss sjukehus', 'Voss', 60.629, 6.422),
	birth('stord', 'Stord sjukehus', 'Stord', 59.79, 5.499),
	birth('haugesund', 'Haugesund sjukehus', 'Haugesund', 59.411, 5.277),
	birth('stavanger', 'Stavanger universitetssjukehus, Ullandhaug', 'Stavanger', 58.937, 5.698),
	birth('flekkefjord', 'Flekkefjord sykehus', 'Flekkefjord', 58.295, 6.66),
	birth('kristiansand', 'Sørlandet sykehus Kristiansand', 'Kristiansand', 58.164, 7.98),
	birth('arendal', 'Sørlandet sykehus Arendal', 'Arendal', 58.46, 8.766),
	birth('skien', 'Sykehuset Telemark, Skien', 'Skien', 59.194, 9.59),
	birth('tonsberg', 'Sykehuset i Vestfold', 'Tonsberg', 59.274, 10.407),
	birth('drammen', 'Drammen sykehus, Brakerøya', 'Drammen', 59.7433, 10.234),
	birth('baerum', 'Bærum sykehus', 'Gjettum', 59.897, 10.51),
	birth('ringerike', 'Ringerike sykehus', 'Hønefoss', 60.16, 10.256),
	birth('kongsberg', 'Kongsberg sykehus', 'Kongsberg', 59.67, 9.646),
	birth('ahus', 'Akershus universitetssykehus', 'Lørenskog', 59.933, 10.998),
	birth('kongsvinger', 'Sykehuset Innlandet Kongsvinger', 'Kongsvinger', 60.19, 12.012),
	birth('kalnes', 'Sykehuset Østfold Kalnes', 'Sarpsborg', 59.319, 11.026),
	birth('ulleval', 'Oslo universitetssykehus Ulleval', 'Oslo', 59.936, 10.736),
	birth('rikshospitalet', 'Oslo universitetssykehus Rikshospitalet', 'Oslo', 59.948, 10.716),
	birth('lillehammer', 'Sykehuset Innlandet Lillehammer', 'Lillehammer', 61.116, 10.467),
	birth('gjovik', 'Sykehuset Innlandet Gjøvik', 'Gjøvik', 60.797, 10.692),
	birth('elverum', 'Sykehuset Innlandet Elverum', 'Elverum', 60.884, 11.56),
	birth('tynset', 'Sykehuset Innlandet Tynset', 'Tynset', 62.275, 10.777),

	acute('mosjoen', 'Helgelandssykehuset Mosjøen', 'Mosjøen', 65.836, 13.19),
	acute('orkdal', 'Orkdal sjukehus', 'Orkanger', 63.299, 9.845),
	acute('nordfjord', 'Nordfjord sjukehus', 'Nordfjordeid', 61.906, 5.985),
	acute('laerdal', 'Lærdal sjukehus', 'Lærdal', 61.051, 7.604),
	acute('haraldsplass', 'Haraldsplass Diakonale Sykehus', 'Bergen', 60.383, 5.362),
	acute('oddah', 'Odda sjukehus', 'Odda', 60.069, 6.546),
	acute('notodden', 'Notodden sykehus', 'Notodden', 59.564, 9.267),
	acute('rjukan', 'Rjukan sykehus', 'Rjukan', 59.879, 8.594),
	acute('lovisenberg', 'Lovisenberg Diakonale Sykehus', 'Oslo', 59.94, 10.763),
	acute('diakonhjemmet', 'Diakonhjemmet sykehus', 'Oslo', 59.936, 10.669),
	acute('hamar', 'Sykehuset Innlandet Hamar', 'Hamar', 60.797, 11.071),
	acute('longyearbyen', 'Longyearbyen sykehus', 'Longyearbyen', 78.223, 15.646)
];
