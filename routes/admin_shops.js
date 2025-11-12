
const r = require('express').Router();
const c = require('../controllers/admin_shops_controller');
r.get('/', c.list);
r.get('/:id', c.get);
r.post('/', c.create);
r.put('/:id', c.update);
r.delete('/:id', c.remove);
module.exports = r;
