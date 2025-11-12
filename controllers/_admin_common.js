
const db = require('../helpers/db_helpers');
const helper = require('../helpers/helpers');

exports.q = db.query.bind(db);
exports.err = helper.ThrowHtmlError;

exports.getDivisionId = (name, cb) => {
  if (!name) return cb(null, null);
  db.query('SELECT id FROM divisions WHERE LOWER(division_name)=LOWER(?) LIMIT 1',
    [name], (e, r) => cb(e, r?.[0]?.id ?? null));
};
