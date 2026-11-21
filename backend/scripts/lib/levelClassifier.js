// Decides a school's education level (Nursery / Primary / Secondary / University / Other) from its NAME first,
// then from the source's own tag. Works worldwide: names are matched in English, French, Spanish, Portuguese, German,
// Italian, Dutch, Indonesian, Hindi/Sanskrit-derived and common Chinese/Japanese/Korean/Russian/Arabic words.
// Source data often labels every "College" or "Institute" as University; whether "college" means a secondary school
// or a university depends on the country, so that is decided per country below.

const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

// Countries where a school simply called "... College" is normally a secondary school.
const COLLEGE_IS_SECONDARY = new Set([
  // Africa
  'cameroon', 'nigeria', 'ghana', 'kenya', 'uganda', 'tanzania', 'zambia', 'malawi', 'zimbabwe', 'sierra leone', 'liberia', 'gambia',
  'ethiopia', 'rwanda', 'burundi', 'south sudan', 'sudan', 'senegal', "cote d'ivoire", 'ivory coast', 'gabon', 'congo',
  'democratic republic of the congo', 'republic of the congo', 'benin', 'togo', 'mali', 'burkina faso', 'niger', 'chad',
  'central african republic', 'equatorial guinea', 'guinea', 'madagascar', 'mauritius', 'seychelles', 'botswana', 'namibia',
  'lesotho', 'eswatini', 'swaziland', 'south africa', 'mozambique', 'angola', 'morocco', 'algeria', 'tunisia', 'mauritania',
  'djibouti', 'comoros', 'somalia', 'eritrea',
  // Europe (French-style "collège"), Ireland
  'france', 'belgium', 'luxembourg', 'switzerland', 'monaco', 'ireland',
  // Caribbean and others where "College" is a secondary school
  'jamaica', 'trinidad and tobago', 'barbados', 'guyana', 'bahamas', 'belize', 'saint lucia', 'grenada', 'dominica',
  'saint vincent and the grenadines', 'antigua and barbuda', 'saint kitts and nevis', 'haiti', 'sri lanka', 'malta', 'cyprus',
]);
const collegeIsSecondary = (country) => COLLEGE_IS_SECONDARY.has(norm(country).replace('cote d’ivoire', "cote d'ivoire"));

const W = (parts) => new RegExp(`(?:^|[^\\p{L}])(?:${parts})(?:$|[^\\p{L}])`, 'iu');       // whole words, any case
const A = (parts) => new RegExp(`(?:^|[^\\p{L}\\p{N}])(?:${parts})(?:$|[^\\p{L}\\p{N}])`, 'u'); // abbreviations: case-sensitive

// Scripts without spaces between words (Chinese, Japanese, Korean, Arabic, Cyrillic) are matched as plain substrings.
const CJK_NURSERY = /幼稚园|幼稚園|幼儿园|幼兒園|유치원|保育園|保育园|детский сад|детсад|روضة/u;
const CJK_PRIMARY = /小学校|小学|小學|초등학교|начальная школа|ابتدائية/u;
const CJK_SECONDARY = /中学|中學|高中|高等学校|고등학교|중학교|средняя школа|гимназия|лицей|ثانوية|اعدادية|إعدادية/u;
const CJK_TERTIARY = /大学院|短期大学|大学|大學|대학교|университет|институт|академия|جامعة|كلية/u;
const NURSERY = W([
  'nursery', 'maternelle', 'maternal', 'kindergarten', 'kinder', 'kindergarden', 'cr[eè]che', 'creche', 'preschool', 'pre-school', 'pre school',
  'playgroup', 'play school', 'playschool', 'pre-primary', 'preprimary', 'daycare', 'day care', 'nido', 'infanzia', 'materna', 'infantil', 'infantes',
  'guarder[ií]a', 'jard[ií]n de infantes', 'jard[ií]n de ni[nñ]os', 'jardim de inf[aâ]ncia', 'kita', 'kindertagesst[aä]tte', 'kleuter', 'peuter',
  'anganwadi', 'balwadi', 'montessori', 'taman kanak', 'paud', 'tk'
].join('|'));
const PRIMARY = W([
  'primary', 'primaire', 'elementary', 'elementaire', 'grade school', 'lower school', 'junior school', 'infant school', 'first school', 'prep school', 'preparatory school',
  'primaria', 'b[aá]sica', 'basica', 'primaria', 'prim[aá]ria', 'ensino fundamental', 'grundschule', 'volksschule', 'basisschool', 'primar[aä]',
  'elementare', 'scuola elementare', 'sekolah dasar', 'sd negeri', 'sdn', 'pathshala', 'vidyalaya primary', 'madrasa ibtidaiyah',
  '[eé]cole (?:publique|catholique|protestante|priv[eé]e|[eé]l[eé]mentaire)',
].join('|'));
const PRIMARY_ABBR = A('GPS|GBPS|GBNPS|CBPS|EP|EPP|EPC|EPB|EPI|EPPP|JPS|BPS|CPS|PS ?\\d+|P\\.S\\. ?\\d+|ES ?\\d+');
const SECONDARY = W([
  'high school', 'highschool', 'senior high', 'junior high', 'secondary', 'lyc[eé]e', 'lycee', 'coll[eè]ge d.enseignement', 'grammar school', 'comprehensive',
  'sixth form', 'sixth-form', 'middle school', 'junior secondary', 'senior secondary', 'upper school', 'senior school', 'junior college', 'pre-university', 'pre university',
  'gymnasium', 'realschule', 'hauptschule', 'gesamtschule', 'oberschule', 'sekundarschule', 'sekundarstufe', 'mittelschule', 'berufsschule',
  'liceo', 'scuola media', 'scuola secondaria', 'istituto tecnico', 'istituto professionale', 'istituto comprensivo', 'instituto de educaci[oó]n secundaria',
  'secundaria', 'bachillerato', 'preparatoria', 'escola secund[aá]ria', 'ensino m[eé]dio', 'ensino medio', 'colegio secundario', 'middelbare', 'atheneum', 'vmbo', 'havo', 'vwo',
  'sekolah menengah', 'smk', 'sma negeri', 'smp negeri', 'sekolah lanjutan', 'vidyalaya', 'higher secondary', 'intermediate college',
  
].join('|'));
const SECONDARY_ABBR = A('GSS|GHS|GBHS|GBTHS|GTHS|GTC|GBTC|GTTC|GBTTC|GBTCS|CETIC|CETIF|CETA|CES|CEG|CEGA|CETI|PSS|PHS|SHS|JHS|JSS|SSS|HS|IES|SMA|SMP|CBC|CCAST|ESO|IUT-?LP');
const TERTIARY = W([
  'universit[a-zà-ÿ]*', 'universidad(?:es)?', 'universidade', 'universiteit', 'universitas', 'hochschule', 'hogeschool', 'fachhochschule', 'polytechni[a-z]*', 'politecnico', 'polit[eé]cnico',
  'higher (?:[a-z]+ ){0,3}(?:institute|school|training|education)', 'institut (?:sup[eé]rieur|universitaire)', 'instituto superior', 'instituto tecnol[oó]gico', 'tecnol[oó]gico',
  'facult(?:y|[eé])', 'facultad', 'faculdade', 'grandes? [eé]coles?', 'community college', 'junior college of', 'technical university', 'university college', 'teachers? college', 'teacher training college of',
  'college of (?:arts|science|sciences|technology|education|health|medicine|agriculture|engineering|law|business|management|nursing|pharmacy|music|art|applied)',
  'school of (?:nursing|medicine|health|pharmacy|law|engineering|business|management|midwifery|dentistry|theology|public health|economics|arts)',
  'institute of (?:technology|management|science|sciences|health|engineering|business|medical|technology and)', 'business school', 'law school', 'medical school', 'graduate school', 'postgraduate',
  'conservatoire', 'conservatory', 'seminary', 'theological', 'vidyapeeth', 'vishwavidyalaya', 'mahavidyalaya', 'mahavidyalay', 'daigaku', 'universit[aä]t', 'universit[eé]', 'accademia di belle arti',
  
].join('|'));
const TERTIARY_ABBR = A('HTTTC|HTTC|ENS|ENSET|ENSP|IUT|ISTA|IUC|NAHPI|FASA|IIT|NIT|IIM|IIIT|MIT|UCLA|UNAM|USP|UCL|UCT|UB|UBa|UY1|UY2|UDla|UDs|UNILAG|UNN|UNIBEN|ICT University|BITS');
const GENERIC_COLLEGE = W('college|coll[eè]ge|colegio|col[eé]gio');

function normalizeRaw(raw) {
  const v = String(raw || '').toLowerCase();
  if (/nursery|kindergarten|preschool|pre-school|early|creche|daycare/.test(v)) return 'Nursery';
  if (/primary|elementary|basic|grade school/.test(v)) return 'Primary';
  if (/secondary|high school|middle|junior|senior/.test(v)) return 'Secondary';
  if (/universit|college|tertiary|higher|postsecondary|post-secondary|polytechnic|institute/.test(v)) return 'University';
  return 'Other';
}

// Returns { level, confident, ambiguous }. confident=true means the name itself settles it.
function classifyLevel({ name, raw, country } = {}) {
  const n = String(name || '').replace(/\./g, '').replace(/\s+/g, ' ').trim();
  if (n) {
    const isPrimary = PRIMARY.test(n) || PRIMARY_ABBR.test(n) || CJK_PRIMARY.test(n);
    if ((NURSERY.test(n) || CJK_NURSERY.test(n)) && !isPrimary) return { level: 'Nursery', confident: true };
    if (isPrimary) return { level: 'Primary', confident: true };
    if (SECONDARY.test(n) || SECONDARY_ABBR.test(n) || CJK_SECONDARY.test(n)) return { level: 'Secondary', confident: true };
    if (TERTIARY.test(n) || TERTIARY_ABBR.test(n) || CJK_TERTIARY.test(n)) return { level: 'University', confident: true };
    if (GENERIC_COLLEGE.test(n)) return { level: collegeIsSecondary(country) ? 'Secondary' : 'University', confident: true };
  }
  const level = normalizeRaw(raw);
  // A bare "college"/"institute" tag from the data source is not proof of a university where colleges are secondary schools.
  if (level === 'University' && collegeIsSecondary(country)) return { level, confident: false, ambiguous: true };
  return { level, confident: false };
}

module.exports = { classifyLevel, normalizeRaw, collegeIsSecondary };
