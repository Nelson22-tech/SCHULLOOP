const test = require('node:test');
const assert = require('node:assert');
const { classifyLevel } = require('../scripts/lib/levelClassifier');

const cases = [
  // [name, country, expected level, raw source label]
  ['G.S.S Kang Barombi', 'Cameroon', 'Secondary', 'university'],
  ['GBTTC ENIEG', 'Cameroon', 'Secondary', 'university'],
  ['Saker Baptist College', 'Cameroon', 'Secondary', 'university'],
  ['University of Buea', 'Cameroon', 'University'],
  ['Higher Technical Teacher Training College Kumba', 'Cameroon', 'University'],
  ['GBPS Molyko', 'Cameroon', 'Primary'],
  ['Ecole Maternelle Bastos', 'Cameroon', 'Nursery'],
  ['Lycée Général Leclerc', 'Cameroon', 'Secondary'],
  ['Government College Umuahia', 'Nigeria', 'Secondary'],
  ['Federal College of Education Zaria', 'Nigeria', 'University'],
  ['Achimota School Junior High', 'Ghana', 'Secondary'],
  ['Alliance High School', 'Kenya', 'Secondary'],
  ['Makerere University', 'Uganda', 'University'],
  ['Harvard College', 'United States', 'University'],
  ['Santa Monica College', 'United States', 'University'],
  ['Lincoln Elementary School', 'United States', 'Primary'],
  ['P.S. 123 Brooklyn', 'United States', 'Primary'],
  ['Stuyvesant High School', 'United States', 'Secondary'],
  ['University High School', 'United States', 'Secondary'],
  ['Eton College', 'United Kingdom', 'University'], // UK data is ambiguous; sixth form/grammar/etc. are caught by name
  ['King Edward VI Grammar School', 'United Kingdom', 'Secondary'],
  ['Hillside Infant School', 'United Kingdom', 'Primary'],
  ['Imperial College London', 'United Kingdom', 'University'],
  ['Collège Victor Hugo', 'France', 'Secondary'],
  ['École Élémentaire Jean Jaurès', 'France', 'Primary'],
  ['Lycée Louis-le-Grand', 'France', 'Secondary'],
  ['Université Paris-Saclay', 'France', 'University'],
  ['École Maternelle Les Lilas', 'France', 'Nursery'],
  ['Gymnasium Schillerschule', 'Germany', 'Secondary'],
  ['Grundschule am Park', 'Germany', 'Primary'],
  ['Technische Universität München', 'Germany', 'University'],
  ['Kita Sonnenschein', 'Germany', 'Nursery'],
  ['Escuela Primaria Benito Juárez', 'Mexico', 'Primary'],
  ['Universidad Nacional Autónoma de México', 'Mexico', 'University'],
  ['Instituto de Educación Secundaria Cervantes', 'Spain', 'Secondary'],
  ['Escola Secundária de Camões', 'Portugal', 'Secondary'],
  ['Liceo Scientifico Galilei', 'Italy', 'Secondary'],
  ['Scuola dell\'Infanzia Rodari', 'Italy', 'Nursery'],
  ['SMA Negeri 1 Jakarta', 'Indonesia', 'Secondary'],
  ['Sekolah Dasar Negeri 3', 'Indonesia', 'Primary'],
  ['Universitas Indonesia', 'Indonesia', 'University'],
  ['Delhi Public School Vidyalaya', 'India', 'Secondary'],
  ['St. Stephen\'s College', 'India', 'University'],
  ['Indian Institute of Technology Bombay', 'India', 'University'],
  ['東京大学', 'Japan', 'University'],
  ['北京市第四中学', 'China', 'Secondary'],
  ['서울초등학교', 'South Korea', 'Primary', 'primary'],
  ['Kingston College', 'Jamaica', 'Secondary'],
  ['Hwa Chong Junior College', 'Singapore', 'Secondary'],
];
for (const [name, country, expected, raw] of cases) {
  test(`${name} (${country}) -> ${expected}`, () => {
    assert.strictEqual(classifyLevel({ name, country, raw: raw || '' }).level, expected);
  });
}
