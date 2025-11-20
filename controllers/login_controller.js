const db = require('./../helpers/db_helpers');
const helper = require('./../helpers/helpers');

module.exports.controller = (app, io, socket_list) => {
    // ---- Helpers ----
    function issueToken(user_id, cb) {
        const token = helper.createRequestToken();
        db.query(
            'UPDATE user_detail SET auth_token=?, modify_date=NOW() WHERE user_id=?',
            [token, user_id],
            (e) => e ? cb(e) : cb(null, token)
        );
    }

    function authGuard(headers, res, cb) {
        helper.CheckParameterValid(res, headers, ['access_token'], () => {
            db.query('SELECT * FROM user_detail WHERE auth_token=? LIMIT 1',
                [headers.access_token],
                (e, rows) => {
                    if (e) return helper.ThrowHtmlError(e, res);
                    if (!rows.length) return res.json({ status: false, message: 'Unauthorized' });
                    cb(rows[0]);
                }
            );
        });
    }

    // ---- AUTH: Register (role = 1 user, 2 doctor, 3 shop) ----
    // ---- AUTH: Register (role = 1 user, 2 doctor, 3 shop) ----
    app.post('/api/auth/register', (req, res) => {
        const { role, mobile_code, mobile, email, password, first_name } = req.body;

        if (![1, 2, 3].includes(Number(role)))
            return res.json({ status: false, message: 'Invalid role (use 1=user, 2=doctor, 3=shop)' });

        if (!mobile_code || !mobile || !password)
            return res.json({ status: false, message: 'mobile_code, mobile, password required' });

        db.query(
            'SELECT user_id FROM user_detail WHERE mobile_code=? AND mobile=? LIMIT 1',
            [mobile_code, mobile],
            (err, existing) => {
                if (err) return helper.ThrowHtmlError(err, res);
                if (existing.length)
                    return res.json({ status: false, message: 'Mobile already registered' });

                const token = helper.createRequestToken();

                db.query(
                    `INSERT INTO user_detail 
         (mobile_code, mobile, email, password, user_type, first_name, auth_token, is_verify, status, created_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, NOW())`,
                    [mobile_code, mobile, email || '', password, role, first_name || '', token],
                    (e2, result) => {
                        if (e2) return helper.ThrowHtmlError(e2, res);

                        // ✅ Return same structure as login
                        res.json({
                            status: true,
                            message: 'Registered successfully',
                            data: {
                                id: result.insertId,             // ✅ Flutter expects 'id'
                                user_id: result.insertId,
                                user_type: role,
                                first_name: first_name || '',
                                email: email || '',
                                mobile: mobile,
                                division_name: 'Dhaka',
                                auth_token: token
                            }
                        });
                    }
                );
            }
        );
    });

    // ---- AUTH: Login (mobile + password) ----
   // ---- AUTH: Login (mobile + password) ----
app.post('/api/auth/login', (req, res) => {

    const { mobile_code, mobile, password } = req.body;

    if (!mobile_code || !mobile || !password)
        return res.json({ status: false, message: 'mobile_code, mobile, password required' });

    db.query(
        'SELECT * FROM user_detail WHERE mobile_code=? AND mobile=? AND password=? AND status!=2 LIMIT 1',
        [mobile_code, mobile, password],
        (e, rows) => {
            if (e) return helper.ThrowHtmlError(e, res);
            if (!rows.length) return res.json({ status: false, message: 'Invalid credentials' });

            const user = rows[0];

            // Generate token
            issueToken(user.user_id, (e2, token) => {
                if (e2) return helper.ThrowHtmlError(e2, res);

                // ===========================================
                // ✅ If user_type = 3 (Shop) → find shop_id
                // ===========================================
                if (user.user_type == 3) {
                    db.query(
                        `SELECT id FROM medical_shops WHERE user_id=? LIMIT 1`,
                        [user.user_id],
                        (err, shopRows) => {

                            let shopId = null;

                            if (!err && shopRows.length) {
                                shopId = shopRows[0].id;
                            }

                            return res.json({
                                status: true,
                                message: 'Login successful',
                                data: {
                                    id: user.user_id,
                                    user_id: user.user_id,
                                    user_type: user.user_type,
                                    shop_id: shopId,     // ⭐ VERY IMPORTANT
                                    first_name: user.first_name || '',
                                    email: user.email || '',
                                    mobile: user.mobile,
                                    division_name: user.division_name || 'Dhaka',
                                    auth_token: token
                                }
                            });
                        }
                    );
                    return;
                }

                // ===========================================
                // ✅ Normal user / doctor login response
                // ===========================================
                res.json({
                    status: true,
                    message: 'Login successful',
                    data: {
                        id: user.user_id,
                        user_id: user.user_id,
                        user_type: user.user_type,
                        shop_id: null, // no shop
                        first_name: user.first_name || '',
                        email: user.email || '',
                        mobile: user.mobile,
                        division_name: user.division_name || 'Dhaka',
                        auth_token: token
                    }
                });

            });
        }
    );
});

    
   app.get('/api/auth/me', (req, res) => {
  authGuard(req.headers, res, (user) => {
    console.log("🧠 Authenticated user:", user); // Debug log

    res.json({
      status: true,
      message: 'User verified',
      data: {
        id: user.user_id,           // ✅ must be here
        user_id: user.user_id,      // ✅ keep both for Flutter
        user_type: user.user_type,
        first_name: user.first_name || '',
        email: user.email || '',
        mobile: user.mobile || '',
        division_name: user.division_name || 'Dhaka',
        auth_token: user.auth_token
      }
    });
  });
});


    // ---- AUTH: Logout ----
    app.post('/api/auth/logout', (req, res) => {
        authGuard(req.headers, res, (user) => {
            db.query('UPDATE user_detail SET auth_token=NULL WHERE user_id=?', [user.user_id], (e) => {
                if (e) return helper.ThrowHtmlError(e, res);
                res.json({ status: true, message: 'Logged out' });
            });
        });
    });

    // ---- REST chat history (doctor room) ----
    app.get('/api/chat/:doctorId/:userId', (req, res) => {
        const { doctorId, userId } = req.params;
        db.query(
            'SELECT * FROM messages WHERE room_type="doctor" AND doctor_id=? AND user_id=? ORDER BY created_at ASC',
            [doctorId, userId],
            (e, rows) => e
                ? res.status(500).json({ status: false })
                : res.json({ status: true, data: rows })
        );
    });

    // ---- fallback REST send (if needed) ----
    app.post('/api/chat/send', (req, res) => {
        const { room_type, doctor_id, shop_id, user_id, sender, message } = req.body;
        const rt = room_type || (doctor_id ? 'doctor' : 'shop');
        db.query(
            'INSERT INTO messages (room_type, doctor_id, shop_id, user_id, sender, message) VALUES (?,?,?,?,?,?)',
            [rt, doctor_id || null, shop_id || null, user_id, sender, message],
            (e) => e ? res.status(500).json({ status: false }) : res.json({ status: true })
        );
    });
};








function checkAccessToken(headerObj, res, callback, requireType = "") {

    helper.Dlog(headerObj);
    helper.CheckParameterValid(res, headerObj, ["access_token"], () => {

        db.query('SELECT `user_id`, `first_name`, `middel_name`, `last_name`, `mobile_code`, `mobile`, `image`, `email`, `os_type`, `auth_token`,  `user_type`, `status` FROM `user_detail` WHERE `auth_token` = ?', [headerObj.access_token], (err, result) => {

            if (err) {
                helper.ThrowHtmlError(err);
                return;
            }

            if (result.length > 0) {
                if (requireType != "") {
                    if (requireType == result[0].user_type) {
                        return callback(result[0]);
                    } else {
                        res.json({
                            'status': '0',
                            'message': 'access denied. Unauthorized user access.',
                            'code': '404'
                        })
                    }
                } else {
                    return callback(result[0]);
                }

            } else {
                res.json({
                    'status': '0',
                    'message': 'access denied. Unauthorized user access.',
                    'code': '404'
                })
            }
        })

    })


}