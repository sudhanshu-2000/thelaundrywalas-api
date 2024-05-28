const express = require("express");
const app = express.Router();
const con = require("../db/conn");
const multer = require("multer");
var jwt = require("jsonwebtoken");
const cors = require("cors");
const fs = require("fs");
require("dotenv").config();
const bcrypt = require("bcrypt");
var bodyParser = require("body-parser");
app.use(
  cors({ origin: ['http://localhost:4200', 'https://admin.thelaundrywalas.com'] })
);
app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 50000,
  })
);
app.use("../../image", express.static("image"));

app.delete("/del", (req, res) => {
  fs.unlink(
    "/image/banners-details/add_banner-1664302399008-677052225.png",
    function (err) {
      if (err) {
        console.error(err);
      } else {
      }
    }
  );
});
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname == "add_banner") {
      cb(null, "image/banners-details");
    } else if (file.fieldname == "add_cat") {
      cb(null, "image/catagory");
    } else if (file.fieldname == "add_sub_cat") {
      cb(null, "image/sub-catagory");
    } else if (file.fieldname == "add_slug") {
      cb(null, "image/slug");
    } else if (file.fieldname == "Add_plan_img") {
      cb(null, "image/plan");
    } else if (file.fieldname == "qr_code") {
      cb(null, "image/QR-Code");
    } else if (file.fieldname == "s_image") {
      cb(null, "image/shopping_image");
    } else if (file.fieldname == "game_type") {
      cb(null, "image/game-type");
    }
    else {
      cb(null, "image/buisness");
    }
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + ".png");
  },
});
const upload = multer({ storage: storage });


app.post("/login", (req, res) => {
  con.query("select (select name from role where id = role_id) as role, (select play_btn from role where id = role_id) as playbtn from role_assign where user_id = (SELECT id FROM `login` where `username`=?);", [req.body.username], (role_err, role_result) => {
    if (role_err) throw role_err;
    if (role_result.length > 0) {
      if ("Super Admin" == role_result[0].role) {
        con.query("select * from login where username = ?", [req.body.username], (err, result) => {
          if (err) throw err;
          if (result[0] != null) {
            const match = bcrypt.compareSync(
              req.body.password,
              result[0].password
            );
            if (match) {
              jwt.sign(
                { username: result[0].username },
                process.env.SECRET_KEY_SUPERADMIN, { expiresIn: '30d' },
                (err, token) => {
                  if (err) throw err;
                  else
                    con.query("UPDATE `login` SET `is_active`='Y' WHERE `username` = ?", [req.body.username]);
                  res.status(200).json({
                    status: true,
                    username: result[0].username,
                    play: role_result[0].playbtn,
                    token,
                  });
                }
              );
            } else {
              res.send("Username And Password is Wrong!");
            }
          } else {
            res.send("Username is not exist");
          }
        }
        );
      } else {
        con.query(
          "select * from login where username = ?",
          [req.body.username],
          (err, result) => {
            if (err) throw err;
            if (result[0] != null) {
              const match = bcrypt.compareSync(
                req.body.password,
                result[0].password
              );
              if (match) {
                jwt.sign(
                  { username: result[0].username },
                  process.env.SECRET_KEY_ADMIN, { expiresIn: '30d' },
                  (err, token) => {
                    if (err) throw err;
                    else
                      con.query("UPDATE `login` SET `is_active`='Y' WHERE `username` = ?", [req.body.username])
                    res.status(200).json({
                      status: true,
                      username: result[0].username,
                      play: role_result[0].playbtn,
                      token,
                    });
                  }
                );
              } else {
                res.send("Username And Password is Wrong!");
              }
            } else {
              res.send("Username is not exist");
            }
          }
        );
      }
    } else {
      res.status(404).json({
        error: true,
        status: false,
        massage: "This user is not assigned role"
      })
    }
  })
});
app.post("/logout", (req, res) => {
  con.query("UPDATE `login` SET `is_active`='N' WHERE `username` = ?", [req.body.username], (err, result) => {
    if (err) { throw err; }
    if (result) {
      res.status(200).send({ error: false, status: true })
    }
  })
});
app.post("/change", verifytoken, (req, res) => {
  con.query(
    "select * from login where username=?",
    [req.body.username],
    (err, result) => {
      if (err) throw err;
      if (result) {
        const status = bcrypt.compareSync(
          req.body.password,
          result[0].password
        );
        if (status == true) {
          const hash = bcrypt.hashSync(
            req.body.new_password,
            bcrypt.genSaltSync(12)
          );
          con.query(
            "UPDATE `login` SET `password`=? WHERE `username`=?",
            [hash, req.body.username],
            (err, result) => {
              if (err) throw err;
              if (result) {
                res.status(200).json({
                  error: false,
                  status: true,
                  message: "Reset Password Successfully",
                });
              }
            }
          );
        } else {
          res.status(200).json({
            error: true,
            message: "Password is Wrong",
          });
        }
      }
    }
  );
});
app.get("/get-activity_maping", (req, res) => {
  con.query("SELECT * FROM `activity_maping`", (error, result) => {
    if (result) {
      res.status(200).send(result);
    } else {
      res.sendStatus(403);
    }
  });
});
app.get("/get-map", (req, res) => {
  var sql =
    "SELECT module.module_name AS name from module  JOIN activity_maping ON module.id = activity_maping.show_manu";
  con.query(sql, function (err, result) {
    if (err) throw err;
    res.send(result);
  });
});


app.post("/add-admin", verifytoken, (req, res) => {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(req.body.password, salt);
  con.query("select m.module_name FROM assign_module as am INNER join module as m on am.module = m.id WHERE am.role = (select role_id from role_assign where user_id = (SELECT id FROM `login` where `username`=?))", [req.body.username], (err, module) => {
    if (err) throw err;
    if (module) {
      const arr = module;
      const f = arr.find(element => element.module_name == 'Sub-Admin');
      if (f == undefined) {
        res.status(403).send({ error: true, status: false, massage: 'You are not Capable to Create Admin' });
      } else {
        con.query(
          "select * from login where username = ?",
          [req.body.nusername],
          (err, result) => {
            if (err) throw err;
            if (result[0] == null) {
              con.query(
                "INSERT INTO `login`(`name`,`username`, `password`) VALUES (?,?,?)",
                [req.body.name, req.body.nusername, hash],
                (err, result) => {
                  if (err) throw err;
                  if (result) {
                    con.query(
                      "INSERT INTO `role_assign`(`role_id`, `user_id`) VALUES (?,(select `id` from login where username = ?))",
                      [req.body.role, req.body.nusername],
                      (err, result) => {
                        if (err) throw err;
                        else {
                          res.status(200).send({ error: false, status: true, massage: 'New Admin Created Successfully' });
                        }
                      }
                    );
                  }
                }
              );
            } else {
              res.status(302).send("Username is already exist");
            }
          }
        );
      }
    }
  })
});
app.post("/update-admin", verifytoken, (req, res) => {
  con.query("select m.module_name FROM assign_module as am INNER join module as m on am.module = m.id WHERE am.role = (select role_id from role_assign where user_id = (SELECT id FROM `login` where `username`=?))", [req.body.username], (err, module) => {
    if (err) throw err;
    if (module) {
      const arr = module;
      const f = arr.find(element => element.module_name == 'Sub-Admin');
      if (f == undefined) {
        res.status(403).send({ error: true, status: false, massage: 'You are not Capable to Create Admin' });
      } else {
        con.query("select `id` from `login` where `username` = ?", [req.body.nusername], (err, check) => {
          if (err) throw err;
          if (check.length > 0) {
            if (check[0].id == req.body.id) {
              con.query(
                "UPDATE `login` SET `username`= ?,`name`= ? WHERE `id` = ?",
                [req.body.nusername, req.body.name, req.body.id],
                (err, result) => {
                  if (err) throw err;
                  if (result) {
                    con.query("UPDATE `role_assign` SET `role_id`=? WHERE `user_id` = ?", [req.body.role, req.body.id], (err, result) => {
                      if (err) throw err;
                      if (result) {
                        res.status(200).send({ error: false, status: true, massage: 'Admin Details Updated Successfully' });
                      }
                    })
                  }
                }
              );
            } else {
              res.status(302).send({ error: true, status: false, massage: 'Username is already Exist' })
            }
          } else {
            con.query(
              "UPDATE `login` SET `username`= ?,`name`= ? WHERE `id` = ?",
              [req.body.nusername, req.body.name, req.body.id],
              (err, result) => {
                if (err) throw err;
                if (result) {
                  con.query("UPDATE `role_assign` SET `role_id`=? WHERE `user_id` = ?", [req.body.role, req.body.id], (err, result) => {
                    if (err) throw err;
                    if (result) {
                      res.status(200).send({ error: false, status: true, massage: 'Admin Details Updated Successfully' });
                    }
                  })
                }
              }
            );
          }
        })
      }
    }
  })
});
app.post("/get-admin", verifytoken, (req, res) => {
  con.query("SELECT l.id,l.name ,l.username, (IFNULL((select role.display_name FROM role WHERE role.id = ra.role_id),'Not Assign')) as role,l.date,l.is_active,l.status  FROM `login` as l LEFT JOIN role_assign as ra on l.id = ra.user_id;", (err, result) => {
    if (err) throw err;
    if (result) {
      res.status(200).send({ error: false, status: true, data: result });
    }
  })
})
app.post("/del-admin", verifytoken, (req, res) => {
  con.query("DELETE FROM `role_assign` WHERE `user_id` = ?", [req.body.id], (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      con.query("DELETE FROM `login` WHERE `id` = ?", [req.body.id], (err, result) => {
        if (err) throw err;
        if (result) {
          res.status(200).send({ error: false, status: true, massage: 'Your Admin has been Deleted SuccessFully' })
        }
      })
    } else {
      con.query("DELETE FROM `login` WHERE `id` = ?", [req.body.id], (err, result) => {
        if (err) throw err;
        if (result) {
          res.status(200).send({ error: false, status: true, massage: 'Your Admin has been Deleted SuccessFully' })
        }
      })
    }
  })
})

// contact
app.post("/add-contact", verifytoken, (req, res) => {
  con.query(
    "INSERT INTO `contact`(`address`, `phone`) VALUES (?,?)",
    [req.body.address, req.body.phone],
    (err, result) => {
      if (err) throw err;
      if (result) {
        res.status(200).send({ error: false, status: true, massage: 'Address Added Successfully' });
      }
    }
  );
});
app.post("/update-contact", verifytoken, (req, res) => {
  con.query(
    "UPDATE `contact` SET `address`=?,`phone`=? WHERE `id`=?",
    [req.body.address, req.body.phone, req.body.id],
    (err, result) => {
      if (err) {
        throw err;
      } if (result) {
        res.status(200).send({
          error: false,
          status: true,
          massage: "Update Details SuccessFully",
        });
      }
    }
  );
});
app.post("/get-contact", verifytoken, (req, res) => {
  con.query("SELECT *  FROM `contact`;", (err, result) => {
    if (err) throw err;
    if (result) {
      res.status(200).send({ error: false, status: true, data: result });
    }
  })
})
app.post("/del-contact", verifytoken, (req, res) => {
  con.query("DELETE FROM `contact` WHERE `id` = ?", [req.body.id], (err, result) => {
    if (err) throw err;
    if (result) {
      res.status(200).send({ error: false, status: true, massage: 'Your User has been Deleted SuccessFully' })
    }
  })
})
app.post("/status-contact", verifytoken, (req, res) => {
  con.query(
    "UPDATE `contact` SET `status`= ? WHERE `id`=?",
    [req.body.status, req.body.id],
    (err, result) => {
      if (err) throw err;
      if (result) {
        res.status(200).send(true);
      }
    }
  );
});

// item-catagory
app.post("/add-item-catagory", verifytoken, (req, res) => {
  con.query(
    "select * from `items_catagory` where `item_catagory` = ?",
    [req.body.item],
    (err, result) => {
      if (err) throw err;
      if (result.length > 0) {
        res.status(404).send({ error: false, status: true, massage: "Items Catagory is already exist" });
      } else {
        con.query(
          "INSERT INTO `items_catagory`(`item_catagory`) VALUES (?)",
          [req.body.item],
          (err, result) => {
            if (err) throw err;
            if (result) {
              res.status(200).send({ error: false, status: true, massage: 'Item Catagory Added Successfully' });
            }
          }
        );
      }
    })
});
app.post("/update-item-catagory", verifytoken, (req, res) => {
  con.query(
    "UPDATE `items_catagory` SET `item_catagory`=? WHERE `id`=?",
    [req.body.item, req.body.id],
    (err, result) => {
      if (err) {
        throw err;
      } if (result) {
        res.status(200).send({
          error: false,
          status: true,
          massage: "Update Details SuccessFully",
        });
      }
    }
  );
});
app.post("/get-item-catagory", verifytoken, (req, res) => {
  con.query("SELECT *  FROM `items_catagory`;", (err, result) => {
    if (err) throw err;
    if (result) {
      res.status(200).send({ error: false, status: true, data: result });
    }
  })
})
app.post("/del-item-catagory", verifytoken, (req, res) => {
  con.query("DELETE FROM `items_catagory` WHERE `id` = ?", [req.body.id], (err, result) => {
    if (err) throw err;
    if (result) {
      res.status(200).send({ error: false, status: true, massage: 'Your User has been Deleted SuccessFully' })
    }
  })
})
app.post("/status-item-catagory", verifytoken, (req, res) => {
  con.query(
    "UPDATE `items_catagory` SET `status`= ? WHERE `id`=?",
    [req.body.status, req.body.id],
    (err, result) => {
      if (err) throw err;
      if (result) {
        res.status(200).send(true);
      }
    }
  );
});

// Price-List
app.post("/add-price-list", verifytoken, (req, res) => {
  con.query(
    "INSERT INTO `price_list`(`item_catagory`, `item_name`, `price`, `unit`) VALUES (?,?,?,?)",
    [req.body.item_catagory, req.body.item_name, req.body.price, req.body.unit],
    (err, result) => {
      if (err) throw err;
      if (result) {
        res.status(200).send({ error: false, status: true, massage: 'Price List Added Successfully' });
      }
    }
  );
});
app.post("/update-price-list", verifytoken, (req, res) => {
  con.query(
    "UPDATE `price_list` SET `item_catagory` = ?, `item_name` = ?, `price` = ?, `unit`= ? WHERE `id`=?",
    [req.body.item_catagory, req.body.item_name, req.body.price, req.body.unit, req.body.id],
    (err, result) => {
      if (err) {
        throw err;
      } if (result) {
        res.status(200).send({
          error: false,
          status: true,
          massage: "Update Details SuccessFully",
        });
      }
    }
  );
});
app.post("/get-price-list", verifytoken, (req, res) => {
  con.query("SELECT pl.*,ic.item_catagory  FROM `price_list` as pl INNER join `items_catagory` as ic on pl.item_catagory = ic.id;", (err, result) => {
    if (err) throw err;
    if (result) {
      res.status(200).send({ error: false, status: true, data: result });
    }
  })
})
app.post("/del-price-list", verifytoken, (req, res) => {
  con.query("DELETE FROM `price_list` WHERE `id` = ?", [req.body.id], (err, result) => {
    if (err) throw err;
    if (result) {
      res.status(200).send({ error: false, status: true, massage: 'Your User has been Deleted SuccessFully' })
    }
  })
})
app.post("/status-price-list", verifytoken, (req, res) => {
  con.query(
    "UPDATE `price_list` SET `status`= ? WHERE `id`=?",
    [req.body.status, req.body.id],
    (err, result) => {
      if (err) throw err;
      if (result) {
        res.status(200).send(true);
      }
    }
  );
});

app.post("/add-activity_maping", verifytoken, (req, res) => {
  con.query(
    "select * from activity_maping where activity_name=?",
    [req.body.name],
    (err, result) => {
      if (err) throw err;
      if (result[0] == null) {
        con.query(
          "INSERT INTO `activity_maping`(`activity_name`, `active_url`,`is_active`,`show_manu`) VALUES (?,?,?,?)",
          [req.body.name, req.body.url, req.body.status, req.body.manu],
          (err, result) => {
            if (err) throw err;
            else {
              res.status(200).send(true);
            }
          }
        );
      } else {
        res.send("Display name is already exist");
      }
    }
  );
});

app.post("/get-user", verifytoken, (req, res) => {
  con.query("SELECT * FROM `user`", (err, result) => {
    if (err) throw err;
    else {
      res.status(200).send({ data: result });
    }
  });
});
app.post("/del-user", verifytoken, (req, res) => {
  con.query("DELETE FROM `user` WHERE `id` = ?", [req.body.id], (err, result) => {
    if (err) throw err;
    if (result) {
      res.status(200).send({ error: false, status: true, massage: 'Your User has been Deleted SuccessFully' })
    }
  })
})
app.post("/status-user", verifytoken, (req, res) => {
  con.query(
    "UPDATE `user` SET `status`=? WHERE `id` = ?",
    [req.body.status, req.body.id],
    (err, result) => {
      if (err) throw err;
      else {
        res.status(200).send(true);
      }
    }
  );
});

app.post("/get-total-data", verifytoken, (req, res) => {
  con.query("SELECT(SELECT IFNULL(COUNT(*),0) FROM user_details) AS total_user,(SELECT IFNULL(COUNT(*),0) FROM user_details WHERE is_active = 'Y') AS active_user,(SELECT IFNULL(SUM(`total`),0) FROM `order_bill`) AS total_collect_amount,(SELECT IFNULL(COUNT(*),0) FROM `order`) AS total_order,(SELECT IFNULL(COUNT(*),0) FROM `order` WHERE status = 'N') AS total_pending_order,(SELECT IFNULL(COUNT(*),0) FROM `order` WHERE status = 'Y') AS total_Success_order,(SELECT IFNULL(COUNT(*),0) FROM `order` WHERE status = 'C') AS total_cencel_order,(SELECT IFNULL(COUNT(*),0) FROM `order` WHERE bill_genrate = 'N') AS total_pending_bill_genrated,(SELECT IFNULL(SUM(`total`),0) FROM `order_bill` WHERE DATE(`date`) = CURDATE()) AS totay_total_collect_amount;", (ro_err, ro_result) => {
    if (ro_err) throw ro_err;
    if (ro_result) {
      res.status(200).json({
        error: false,
        status: true,
        data: ro_result
      })
    }
  })
});

app.post("/get-menu", verifytoken, (req, res) => {
  con.query("select role_id from role_assign where user_id = (SELECT id FROM `login` where `username`=?);", [req.body.username], (role_err, role_result) => {
    if (role_err) throw role_err;
    if (role_result.length > 0) {
      con.query("SELECT am.id,m.module_name,m.url,am.status,am.date FROM assign_module as am inner Join module as m on am.module = m.id where role = ? ORDER BY am.position ASC;", [role_result[0].role_id], (ro_err, ro_result) => {
        if (ro_err) throw ro_err;
        if (ro_result) {
          res.status(200).json({
            error: false,
            status: true,
            data: ro_result
          })
        }
      })
    } else {
      res.status(404).json({
        error: true,
        status: false,
        massage: "This user is not assigned role"
      })
    }
  })
});

app.post("/add-role", verifytoken, (req, res) => {
  con.query(
    "select * from role where display_name=?",
    [req.body.display_name],
    (err, result) => {
      if (err) throw err;
      if (result.length > 0) {
        res.send("Display name is already exist");
      } else {
        con.query(
          "INSERT INTO `role`(`name`, `display_name`, `view`, `delete_d`, `update_d`, `play_btn`) VALUES (?,?,?,?,?,?)",
          [req.body.name, req.body.display_name, (req.body.view_d).toString(), (req.body.delete_d).toString(), (req.body.update_d).toString(), (req.body.play_d).toString()],
          (err, result) => {
            if (err) throw err;
            if (result) {
              res.status(200).json({
                error: false,
                status: true,
              });
            }
          }
        );
      }
    }
  );
});
app.post("/get-role", verifytoken, (req, res) => {
  con.query("select * from role", (err, result) => {
    if (err) throw err;
    res.status(200).json({ data: result });
  });
});
app.post("/status-role", verifytoken, (req, res) => {
  con.query(
    "UPDATE `role` SET `status`= ? WHERE `id`=?",
    [req.body.status, req.body.id],
    (err, result) => {
      if (err) throw err;
      if (result) {
        res.status(200).send({ error: false, status: true })
      }
    }
  );
})
app.post("/update-role", verifytoken, (req, res) => {
  con.query("UPDATE `role` SET `name`=?,`display_name`=?,`view`=?,`delete_d`=?,`update_d`=?,`play_btn`=? WHERE `id`=?", [req.body.name, req.body.dname, (req.body.view_d).toString(), (req.body.delete_d).toString(), (req.body.update_d).toString(), (req.body.play_d).toString(), req.body.id], (err, result) => {
    if (err) throw err;
    res.status(200).json({ error: false, status: true });
  });
});
app.post("/get-role-not-assign", verifytoken, (req, res) => {
  con.query("select * from role where role_assign = 'N'", (err, result) => {
    if (err) throw err;
    res.status(200).json({ data: result });
  });
});
app.post("/get-role-assign", verifytoken, (req, res) => {
  con.query("select * from role where role_assign = 'Y'", (err, result) => {
    if (err) throw err;
    res.status(200).json({ data: result });
  });
});

app.post("/add-game-mapping", verifytoken, (req, res) => {
  let num = req.body.color.length;
  let num2 = 0;
  for (var index = 0; index < req.body.color.length; index++) {
    num2 = num2 + 1;
    con.query(
      "INSERT INTO `game_mapping`(`for_color_or_number`, `color_id`, `number_id`, `game_type_id`, `multiple`) VALUES (?,?,?,?,?)",
      [
        req.body.for_color_or_number,
        req.body.color[index].id,
        req.body.number,
        req.body.game_type,
        req.body.multiple,
      ]
    );
  }
  if (num2 === num) {
    res.status(200).send({
      error: false,
      status: true,
      massage: "Add Game Mapping SuccessFully",
    });
  }
});
app.post("/get-game-mapping-number", verifytoken, (req, res) => {
  if (req.body.id == 0) {
    con.query(
      "SELECT gm.id, gt.nickname as game_type,gc.name as color_name,gc.code as color_code,gn.number as number,gm.multiple,gm.status , gm.date FROM game_mapping gm INNER JOIN game_color gc ON gc.id = gm.color_id INNER JOIN game_number gn ON gn.id = gm.number_id INNER JOIN game_type gt ON gt.id = gm.game_type_id ORDER BY CAST(number AS UNSIGNED INTEGER);",
      (err, result) => {
        if (err) throw err;
        if (result) res.status(200).send(result);
      }
    );
  } else {
    con.query(
      "SELECT gm.id, gt.nickname as game_type,gc.name as color_name,gc.code as color_code,gn.number as number,gm.multiple,gm.status , gm.date FROM game_mapping gm INNER JOIN game_color gc ON gc.id = gm.color_id INNER JOIN game_number gn ON gn.id = gm.number_id INNER JOIN game_type gt ON gt.id = gm.game_type_id where gm.game_type_id = ? ORDER BY CAST(number AS UNSIGNED INTEGER);",
      [req.body.id],
      (err, result) => {
        if (err) throw err;
        if (result) res.status(200).send(result);
      }
    );
  }
});
app.post("/get-game-mapping-number-id", verifytoken, (req, res) => {
  con.query(
    "SELECT gm.id, gm.for_color_or_number ,gt.nickname as game_type,gc.name as color_name,gc.code as color_code,gn.number as number,gm.multiple,gm.status , gm.date FROM game_mapping gm INNER JOIN game_color gc ON gc.id = gm.color_id INNER JOIN game_number gn ON gn.id = gm.number_id INNER JOIN game_type gt ON gt.id = gm.game_type_id WHERE gm.id=? ORDER BY CAST(number AS UNSIGNED INTEGER) ",
    [req.body.id],
    (err, result) => {
      if (err) throw err;
      if (result) res.status(200).send(result);
    }
  );
});
app.post("/del-game-mapping-number", verifytoken, (req, res) => {
  con.query(
    "delete from `game_mapping` where id =?",
    [req.body.id],
    (err, result) => {
      if (err) throw err;
      if (result) res.status(200).send(true);
    }
  );
});
app.post("/get-game-mapping-color", verifytoken, (req, res) => {
  if (req.body.id == 0) {
    con.query(
      "SELECT gm.id, gm.for_color_or_number,gt.nickname as game_type,gc.name as color_name,gc.code as color_code ,gm.multiple,gm.status , gm.date FROM game_mapping gm INNER JOIN game_color gc ON gc.id =  gm.color_id INNER JOIN game_type gt ON gt.id =  gm.game_type_id where gm.for_color_or_number='only_color'",
      (err, result) => {
        if (err) throw err;
        if (result) res.status(200).send(result);
      }
    );
  } else {
    con.query(
      "SELECT gm.id, gm.for_color_or_number,gt.nickname as game_type,gc.name as color_name,gc.code as color_code ,gm.multiple,gm.status , gm.date FROM game_mapping gm INNER JOIN game_color gc ON gc.id =  gm.color_id INNER JOIN game_type gt ON gt.id =  gm.game_type_id where gm.for_color_or_number='only_color' AND gm.game_type_id = ?",
      [req.body.id],
      (err, result) => {
        if (err) throw err;
        if (result) res.status(200).send(result);
      }
    );
  }
});
app.post("/get-game-mapping-color-id", verifytoken, (req, res) => {
  con.query(
    "SELECT gm.id, gm.for_color_or_number,gt.nickname as game_type,gc.name as color_name,gc.code as color_code ,gm.multiple,gm.status , gm.date FROM game_mapping gm INNER JOIN game_color gc ON gc.id =  gm.color_id INNER JOIN game_type gt ON gt.id =  gm.game_type_id where gm.for_color_or_number='only_color'AND gm.id=?",
    [req.body.id],
    (err, result) => {
      if (err) throw err;
      if (result) res.status(200).send(result);
    }
  );
});

app.post("/add-module", verifytoken, (req, res) => {
  con.query(
    "select * from module where module_name=?",
    [req.body.module_name],
    (err, result) => {
      if (err) throw err;
      if (result[0] == null) {
        con.query(
          "INSERT INTO `module`(`url`, `module_name`) VALUES (?,?)",
          [req.body.url, req.body.module_name],
          (err, result) => {
            if (err) throw err;
            else {
              res.status(200).send(true);
            }
          }
        );
      } else {
        res.send("Module name is already exist");
      }
    }
  );
});
app.post("/get-module", verifytoken, (req, res) => {
  con.query("select * from `module`", (err, result) => {
    if (err) throw err;
    else {
      res.status(200).send({ data: result });
    }
  });
});
app.post("/status-module", verifytoken, (req, res) => {
  con.query(
    "UPDATE `module` SET `status`= ? WHERE `id`=?",
    [req.body.status, req.body.id],
    (err, result) => {
      if (err) throw err;
      else {
        res.status(200).send(true);
      }
    }
  );
});
app.post("/get-module-id", verifytoken, (req, res) => {
  con.query(
    "select * from `module` where id=?",
    [req.body.id],
    (err, result) => {
      if (err) throw err;
      else {
        res.status(200).send(result);
      }
    }
  );
});
app.post("/update-module", (req, res) => {
  con.query(
    "UPDATE `module` SET `module_name`=?,`url`=? WHERE `id`=?",
    [req.body.module_name, req.body.url, req.body.id],
    (err, result) => {
      if (err) {
        if (err.code == "ER_DUP_ENTRY") {
          res.status(403).send("module name is already exist");
        }
      } else {
        res.status(200).send(true);
      }
    }
  );
});
app.post("/del-module", verifytoken, (req, res) => {
  con.query("DELETE FROM `module` where id=?", [req.body.id], (err, result) => {
    if (err) throw err;
    else {
      res.status(200).send(true);
    }
  });
});
app.post("/assign-module", verifytoken, (req, res) => {
  for (var module of req.body.module) {
    con.query("INSERT INTO `assign_module`(`role`, `module`,`position`) VALUES (?,?,(SELECT MAX(m.`position`)+1 FROM `assign_module` as m))", [req.body.role_id, module])
  }
  con.query("UPDATE `role` SET `role_assign`='Y' WHERE `id`=?", [req.body.role_id], (err, result) => {
    if (err) throw err;
    if (result) {
      res.status(200).json({
        error: false,
        status: true,
        message: "Module Assign Successfully"
      })
    }
  })
});
app.post("/get-assign-module", verifytoken, (req, res) => {
  con.query('SELECT am.id,m.module_name,r.display_name FROM `assign_module` am INNER join module m on am.module = m.id INNER JOIN role r on am.role = r.id WHERE am.role = ? order by position', [req.body.id], (err, result) => {
    if (err) throw err;
    if (result) {
      res.status(200).json({
        error: false,
        status: true,
        data: result
      })
    }
  })
});
app.post("/update-assign-module", verifytoken, (req, res) => {
  con.query("DELETE FROM `assign_module` WHERE `role` = ?", [req.body.role_id], (error, resultt) => {
    if (error) {
      throw error;
    }
    if (resultt) {
      con.query('SELECT MAX(`position`) as max FROM `assign_module`', (errors, results) => {
        if (errors) { throw errors }
        if (results) {
          let max = results[0].max + 1;
          for (var module of req.body.module) {
            con.query("INSERT INTO `assign_module`(`role`, `module`,`position`) VALUES (?,?,?)", [req.body.role_id, module, max])
            max = max + 1;
          }
        }
      })
    }
    res.status(200).json({
      error: false,
      status: true,
      message: "Module Assign Upadated Successfully"
    })
  })

});
app.post("/get-assign-module-id", verifytoken, (req, res) => {
  con.query('SELECT am.module FROM `assign_module` am INNER join module m on am.module = m.id INNER JOIN role r on am.role = r.id WHERE am.role = ?', [req.body.id], (err, result) => {
    if (err) throw err;
    if (result) {
      res.status(200).json({
        error: false,
        status: true,
        data: result
      })
    }
  })
});
app.post("/update-postion", verifytoken, (req, res) => {
  con.query("select role_id from role_assign where user_id = (SELECT id FROM `login` where `username`=?);", [req.body.username], (role_err, role_result) => {
    if (role_err) throw role_err;
    if (role_result.length > 0) {
      con.query("SELECT am.id,m.module_name,m.url,am.position,am.status,am.date FROM assign_module as am inner Join module as m on am.module = m.id where role = ? ORDER BY am.position ASC;", [role_result[0].role_id], (ro_err, ro_result) => {
        if (ro_err) throw ro_err;
        if (ro_result) {
          for (let index = 0; index < req.body.data.length; index++) {
            con.query("UPDATE `assign_module` SET `position`=? WHERE `id`=?", [ro_result[index].position, req.body.data[index].id]);
          }
          res.status(200).json({
            error: false,
            status: true,
          })
        }
      })
    }
  })
})

app.post("/add-game-type", upload.single("game_type"), verifytoken, (req, res) => {
  con.query(
    "select * from `game_type` where `nickname`=?",
    [req.body.nickname],
    (err, result) => {
      if (err) throw err;
      if (result.length > 0) {
        res.send("Nickname is already exist");
      } else {
        con.query(
          "INSERT INTO `game_type`(`name`, `nickname`,`img`,`timer`) VALUES (?,?,?,?)",
          [req.body.name, req.body.nickname, req.file.filename, 2],
          (err, result) => {
            if (err) throw err;
            if (result) {
              res.status(200).send(true);
            }
          }
        );
      }
    }
  );
});
app.post("/get-game-type", verifytoken, (req, res) => {
  con.query("select * from `game_type`", (err, result) => {
    if (err) throw err;
    else {
      res.status(200).send({ data: result });
    }
  });
});
app.post("/status-game-type", verifytoken, (req, res) => {
  con.query(
    "UPDATE `game_type` SET `status`= ? WHERE `id`=?",
    [req.body.status, req.body.id],
    (err, result) => {
      if (err) throw err;
      else {
        res.status(200).send(true);
      }
    }
  );
});
app.post("/get-game-type-id", verifytoken, (req, res) => {
  con.query(
    "select * from `game_type` where id=?",
    [req.body.id],
    (err, result) => {
      if (err) throw err;
      else {
        res.status(200).send(result);
      }
    }
  );
});
app.post("/update-game-type", (req, res) => {
  con.query(
    "UPDATE `game_type` SET `name`=?,`nickname`=? WHERE `id`=?",
    [req.body.name, req.body.nickname, req.body.id],
    (err, result) => {
      if (err) {
        if (err.code == "ER_DUP_ENTRY") {
          res.status(403).send("Nickname is already exist");
        }
      } else {
        res.status(200).send(true);
      }
    }
  );
});
app.post("/del-game-type", verifytoken, (req, res) => {
  con.query(
    "DELETE FROM `game_type` where id=?",
    [req.body.id],
    (err, result) => {
      if (err) throw err;
      else {
        res.status(200).send(true);
      }
    }
  );
});

app.post("/add-game-color", verifytoken, (req, res) => {
  con.query(
    "select * from game_color where code=?",
    [req.body.code],
    (err, result) => {
      if (err) throw err;
      if (result[0] == null) {
        con.query(
          "INSERT INTO `game_color`(`name`, `code`) VALUES (?,?)",
          [req.body.name, req.body.code],
          (err, result) => {
            if (err) throw err;
            else {
              res.status(200).send(true);
            }
          }
        );
      } else {
        res.send("Code is already exist");
      }
    }
  );
});
app.post("/get-game-color", verifytoken, (req, res) => {
  con.query("select * from `game_color`", (err, result) => {
    if (err) throw err;
    else {
      res.status(200).send({ data: result });
    }
  });
});
app.post("/status-game-color", verifytoken, (req, res) => {
  con.query(
    "UPDATE `game_color` SET `status`= ? WHERE `id`=?",
    [req.body.status, req.body.id],
    (err, result) => {
      if (err) throw err;
      else {
        res.status(200).send(true);
      }
    }
  );
});
app.post("/get-game-color-id", verifytoken, (req, res) => {
  con.query(
    "select * from `game_color` where id=?",
    [req.body.id],
    (err, result) => {
      if (err) throw err;
      else {
        res.status(200).send(result);
      }
    }
  );
});
app.post("/update-game-color", (req, res) => {
  con.query(
    "UPDATE `game_color` SET `name`=?,`code`=? WHERE `id`=?",
    [req.body.name, req.body.code, req.body.id],
    (err, result) => {
      if (err) {
        if (err.code == "ER_DUP_ENTRY") {
          res.status(403).send("Nickname is already exist");
        }
      } else {
        res.status(200).send(true);
      }
    }
  );
});
app.post("/del-game-color", verifytoken, (req, res) => {
  con.query(
    "DELETE FROM `game_color` where id=?",
    [req.body.id],
    (err, result) => {
      if (err) throw err;
      else {
        res.status(200).send(true);
      }
    }
  );
});

app.post("/get-game-number", verifytoken, (req, res) => {
  con.query("select * from `game_number`", (err, result) => {
    if (err) throw err;
    else {
      res.status(200).send({ data: result });
    }
  });
});

app.post("/get-pay-method", verifytoken, (req, res) => {
  con.query("select * from the_laundry_walas.payment_method", (err, result) => {
    if (err) throw err;
    if (result) {
      res.status(200).send({
        error: false,
        status: true,
        data: result,
      });
    }
  });
});
app.post("/add-payment-details-upi", upload.single("qr_code"), verifytoken, (req, res) => {
  var body = req.body;
  con.query(
    "select * from payment_details where UPI_id = ?",
    [body.upi_id],
    (err, result) => {
      if (err) throw err;
      if (result.length > 0) {
        res.status(302).json({
          error: true,
          status: false,
          massage: "UPI Id is Already exist",
        });
      } else {
        if (req.body.payment_method === "Google Pay") {
          con.query(
            "INSERT INTO `payment_details`(`paymethod_id`, `name`, `UPI_id`, `QR_code`, `icons`) VALUES (?,?,?,?,?)",
            [
              body.payment_method,
              body.name,
              body.upi_id,
              req.file.filename,
              "googlepay.png",
            ],
            (err, result) => {
              if (err) throw err;
              if (result) {
                res.status(200).json({
                  error: false,
                  status: true,
                  massage: "Insert Google Pay Details SuccessFully",
                });
              }
            }
          );
        } else if (req.body.payment_method === "Phone Pe") {
          con.query(
            "INSERT INTO `payment_details`(`paymethod_id`, `name`, `UPI_id`, `QR_code`, `icons`) VALUES (?,?,?,?,?)",
            [
              body.payment_method,
              body.name,
              body.upi_id,
              req.file.filename,
              "phonepe.png",
            ],
            (err, result) => {
              if (err) throw err;
              if (result) {
                res.status(200).json({
                  error: false,
                  status: true,
                  massage: "Insert Phone pe Details SuccessFully",
                });
              }
            }
          );
        } else {
          con.query(
            "INSERT INTO `payment_details`(`paymethod_id`, `name`, `UPI_id`, `QR_code`, `icons`,`mobile_no`) VALUES (?,?,?,?,?,?)",
            [
              body.payment_method,
              body.name,
              body.upi_id,
              req.file.filename,
              "paytm.png",
              body.upinumber,
            ],
            (err, result) => {
              if (err) throw err;
              if (result) {
                res.status(200).json({
                  error: false,
                  status: true,
                  massage: "Insert Paytm Details SuccessFully",
                });
              }
            }
          );
        }
      }
    }
  );
}
);
app.post("/add-payment-detail-upi", verifytoken, (req, res) => {
  var body = req.body;
  con.query(
    "select * from payment_details where UPI_id = ?",
    [body.upi_id],
    (err, result) => {
      if (err) throw err;
      if (result.length > 0) {
        res.status(302).json({
          error: true,
          status: false,
          massage: "UPI Id is Already exist",
        });
      } else {
        {
          con.query(
            "INSERT INTO `payment_details`(`paymethod_id`, `name`, `UPI_id`, `icons`) VALUES (?,?,?,?)",
            [
              body.payment_method,
              body.name,
              body.upi_id,
              "upi.png",
            ],
            (err, result) => {
              if (err) throw err;
              if (result) {
                res.status(200).json({
                  error: false,
                  status: true,
                  massage: "Insert Paytm Details SuccessFully",
                });
              }
            }
          );
        }
      }
    }
  );
}
);
app.post("/add-payment-details-bank", verifytoken, (req, res) => {
  var body = req.body;
  con.query(
    "select * from payment_details where account_no = ?",
    [body.account_no],
    (err, result) => {
      if (err) throw err;
      if (result.length > 0) {
        res.status(302).json({
          error: true,
          status: false,
          massage: "Account Number is Already exist",
        });
      } else {
        con.query(
          "INSERT INTO `payment_details`(`paymethod_id`, `name`, `bank_name`, `account_no`, `ifsc_code`, `account_type`) VALUES (?,?,?,?,?,?)",
          [
            parseInt(body.payment_method),
            body.name,
            body.bank_name,
            body.account_no,
            body.ifsc_code,
            body.account_type,
          ],
          (err, result) => {
            if (err) throw err;
            if (result) {
              res.status(200).json({
                error: false,
                status: true,
                massage: "Insert Bank Details SuccessFully",
              });
            }
          }
        );
      }
    }
  );
});
app.post("/get-payment-details", verifytoken, (req, res) => {
  con.query(
    "select pd.id,pm.id as pm_id,pm.name as payment_method,pd.name,pd.mobile_no,pd.UPI_id,pd.QR_code,pd.bank_name,pd.account_no,pd.ifsc_code,pd.account_type,pm.icon,pd.status from  the_laundry_walas.payment_details as pd inner Join  the_laundry_walas.payment_method as pm on pd.paymethod_id = pm.id where pm.name = ?;",
    [req.body.method],
    (err, result) => {
      if (err) throw err;
      else {
        res.status(200).send({ data: result });
      }
    }
  );
});
app.post("/status-payment-details", verifytoken, (req, res) => {
  con.query(
    "UPDATE `payment_details` SET `status`=? WHERE `id`= ?",
    [req.body.method, req.body.id],
    (err, result) => {
      if (err) throw err;
      if (result) {
        res.status(200).json({
          error: false,
          status: true,
          massage: " Status Changed SuccessFully",
        });
      }
    }
  );
});
app.post("/del-payment-details", verifytoken, (req, res) => {
  con.query(
    "DELETE FROM `payment_details` where id=?",
    [req.body.id],
    (err, result) => {
      if (err) {
        if (true == (err.sqlMessage == "Cannot delete or update a parent row: a foreign key constraint fails (` the_laundry_walas`.`deposit`, CONSTRAINT `paymethod_id` FOREIGN KEY (`paymethod_id`) REFERENCES `payment_details` (`id`))")) {
          res.status(405).json({
            error: true,
            status: false,
            massage: "This payment method is already Used",
          });
        } else {
          throw err;
        }
      }
      else {
        res.status(200).json({
          error: false,
          status: true,
          massage: "Your file has been deleted.",
        });
      }
    }
  );
});
app.post("/update-payment-details", upload.single("qr_code"), verifytoken, (req, res) => {
  con.query(
    "UPDATE `payment_details` SET `name`=?,`UPI_id`=?,`QR_code`=? WHERE `id`=?",
    [req.body.name, req.body.upi_id, req.file.filename, req.body.id],
    (err, result) => {
      if (err) {
        if (err.code == "ER_DUP_ENTRY") {
          res.status(403).send("UPI Id is already exist");
        }
      }
      if (result) {
        res.status(200).send({
          error: false,
          status: true,
          massage: "Update Details SuccessFully",
        });
      }
    }
  );
});
app.post("/update-bank-payment-details", verifytoken, (req, res) => {
  var body = req.body;
  con.query("select id from `payment_details` where  `account_no` = ?", [body.account_no], (errror, ressult) => {
    if (errror) throw errror;
    if (ressult.length > 0) {
      if (ressult[0].id == body.id) {
        con.query(
          "UPDATE `payment_details` SET `name`=?,`bank_name`=?,`account_no`=?,`ifsc_code`=?,`account_type`=? WHERE `id`=?",
          [
            body.name,
            body.bank_name,
            body.account_no,
            body.ifsc_code,
            body.account_type,
            body.id,
          ],
          (err, result) => {
            if (err) {
              throw err;
            }
            if (result) {
              res.status(200).send({ error: false, status: true, massage: "Details Updated SuccessFully" });
            }
          }
        );
      } else {
        res.status(302).send({ error: true, status: false, massage: "Account No is already exist" });
      }
    } else {
      con.query(
        "UPDATE `payment_details` SET `name`=?,`bank_name`=?,`account_no`=?,`ifsc_code`=?,`account_type`=? WHERE `id`=?",
        [
          body.name,
          body.bank_name,
          body.account_no,
          body.ifsc_code,
          body.account_type,
          body.id,
        ],
        (err, result) => {
          if (err) {
            throw err;
          }
          if (result) {
            res.status(200).send({ error: false, status: true, massage: "Details Updated SuccessFully" });
          }
        }
      );
    }
  })

});

app.post("/get-user-details", verifytoken, (req, res) => {
  con.query(
    "SELECT `id`, `name`, `email`, `phone`, `street`, `city`, `zipcode`, `country`, `is_active`, `date`, `status` FROM `user_details`",
    [req.body.method],
    (err, result) => {
      if (err) throw err;
      else {
        res.status(200).send({
          error: false,
          status: true,
          data: result,
        });
      }
    }
  );
});
app.post("/status-user-details", verifytoken, (req, res) => {
  con.query(
    "UPDATE `user_details` SET `status`=? WHERE `id`= ?",
    [req.body.status, req.body.id],
    (err, result) => {
      if (err) throw err;
      if (result) {
        res.status(200).json({
          error: false,
          status: true,
          massage: "Status Changed SuccessFully",
        });
      }
    }
  );
});
app.post("/del-user-details", verifytoken, (req, res) => {
  con.query(
    "DELETE FROM `user_details` where id=?",
    [req.body.id],
    (err, result) => {
      if (err) throw err;
      if (result) {
        con.query(
          "DELETE FROM `wallet` where id=?",
          [req.body.wid],
          (err, result) => {
            if (err) throw err;
            else {
              res.status(200).json({
                error: false,
                status: true,
                massage: "Your Details has been deleted.",
              });
            }
          }
        );
      }
    }
  );
});
app.post("/update-user-details", verifytoken, (req, res) => {
  con.query(
    "UPDATE `payment_details` SET `name`=?,`UPI_id`=?,`QR_code`=? WHERE `id`=?",
    [req.body.name, req.body.upi_id, req.file.filename, req.body.id],
    (err, result) => {
      if (err) {
        if (err.code == "ER_DUP_ENTRY") {
          res.status(403).send("UPI Id is already exist");
        }
      }
      if (result) {
        res.status(200).send({
          error: false,
          status: true,
          massage: "Update Details SuccessFully",
        });
      }
    }
  );
});

app.post("/get-deposit-request", verifytoken, (req, res) => {
  if (req.body.status === "Pending") {
    con.query(
      "SELECT cd.id,cd.user_name,cd.image,cd.transaction_id,cd.reason,cd.payment,cd.balance,cd.status,cd.Approved_declined_By,cp.name as holder_name,cp.account_no,cp.account_type,cp.bank_name,cp.ifsc_code,cp.UPI_id,cd.date FROM  the_laundry_walas.`deposit` as cd inner join  the_laundry_walas.payment_details as cp on cd.paymethod_id = cp.id WHERE cd.`status` = 'Pending';",
      (err, result) => {
        if (err) throw err;
        if (result) {
          res.status(200).send({
            error: false,
            status: true,
            data: result,
          });
        }
      }
    );
  } else if (req.body.status === "Success") {
    con.query(
      "SELECT cd.id,cd.user_name,cd.image,cd.transaction_id,cd.reason,cd.payment,cd.balance,cd.status,cd.Approved_declined_By,cp.name as holder_name,cp.account_no,cp.account_type,cp.bank_name,cp.ifsc_code,cp.UPI_id,cd.date FROM  the_laundry_walas.`deposit` as cd inner join  the_laundry_walas.payment_details as cp on cd.paymethod_id = cp.id WHERE cd.`status` = 'Success';",
      (err, result) => {
        if (err) throw err;
        if (result) {
          res.status(200).send({
            error: false,
            status: true,
            data: result,
          });
        }
      }
    );
  } else if (req.body.status === "Canceled") {
    con.query(
      "SELECT cd.id,cd.user_name,cd.image,cd.transaction_id,cd.reason,cd.payment,cd.balance,cd.status,cd.Approved_declined_By,cp.name as holder_name,cp.account_no,cp.account_type,cp.bank_name,cp.ifsc_code,cp.UPI_id,cd.date FROM  the_laundry_walas.`deposit` as cd inner join  the_laundry_walas.payment_details as cp on cd.paymethod_id = cp.id WHERE cd.`status` = 'Canceled';",
      (err, result) => {
        if (err) throw err;
        if (result) {
          res.status(200).send({
            error: false,
            status: true,
            data: result,
          });
        }
      }
    );
  } else {
    con.query(
      "SELECT cd.id,cd.user_name,cd.image,cd.transaction_id,cd.reason,cd.payment,cd.balance,cd.status,cd.Approved_declined_By,cp.name as holder_name,cp.account_no,cp.account_type,cp.bank_name,cp.ifsc_code,cp.UPI_id,cd.date FROM  the_laundry_walas.`deposit` as cd inner join  the_laundry_walas.payment_details as cp on cd.paymethod_id = cp.id;",
      (err, result) => {
        if (err) throw err;
        if (result) {
          res.status(200).send({
            error: false,
            status: true,
            data: result,
          });
        }
      }
    );
  }
});
app.post("/approve-deposit-request", verifytoken, (req, res) => {
  con.query(
    "UPDATE `deposit` SET `status`='Success',`Approved_declined_By`=? WHERE `id` = ?",
    [req.body.username, req.body.id],
    (error, result) => {
      if (error) throw error;
      if (result) {
        con.query(
          "UPDATE `wallet` SET `wallet_balance` = wallet_balance + (SELECT `balance` from `deposit` where `id` = ?) WHERE `user_name` = ?;",
          [req.body.id, req.body.mobile],
          (err, resultt) => {
            if (err) throw err;
            if (resultt) {
              con.query("INSERT INTO `statement`(`username`,`bet_or_type`, `bet_from`, `bet_balance`, `total_balance`) VALUES (?,'Deposit Balance','Deposit Wallet',(SELECT `balance` from `deposit` where `id` = ?),(SELECT `wallet_balance` FROM `wallet` WHERE `user_name` = ?))",
                [req.body.mobile, req.body.id, req.body.mobile], (errr, resu) => {
                  if (errr) { throw errr; }
                  if (resu) {
                    con.query("SELECT * FROM `deposit` WHERE `status` = 'Success' and `user_name` = ?", [req.body.mobile], (errors, results) => {
                      if (errors) { throw errors }
                      if (results.length == 1) {
                        con.query("UPDATE `wallet` SET `Bonus_wallet` = Bonus_wallet + (SELECT `reffer_by` FROM `reffer_bonus` WHERE `status` = 'Y') WHERE `user_name` = ?;", [req.body.mobile], (err, result1) => {
                          if (err) { throw err; }
                          if (result1) {
                            con.query("INSERT INTO `statement`(`username`,`bet_or_type`, `bet_from`, `bet_balance`, `total_balance`) VALUES (?,'Bonus','Sign Up', (SELECT `reffer_by` FROM `reffer_bonus` WHERE `status` = 'Y'), (SELECT `wallet_balance` FROM `wallet` WHERE `user_name` = ?))",
                              [req.body.mobile, req.body.mobile])
                          }
                        })
                        con.query("UPDATE `wallet` SET `Bonus_wallet` = Bonus_wallet + (SELECT `reffer_to` FROM `reffer_bonus` WHERE `status` = 'Y') WHERE `user_name` =   (SELECT `user_name` FROM `user_details` WHERE `reffer_code`= (SELECT `reffer_by` FROM `user_details` WHERE `user_name` = ?));", [req.body.mobile], (err, result1) => {
                          z
                          if (err) { throw err; }
                          if (result1) {
                            con.query("INSERT INTO `statement`(`username`,`bet_or_type`, `bet_from`, `bet_balance`, `total_balance`) VALUES ((SELECT `user_name` FROM `user_details` WHERE `reffer_code`= (SELECT `reffer_by` FROM `user_details` WHERE `user_name` = ?)),'Bonus','Reffer-Bonus', (SELECT `reffer_by` FROM `reffer_bonus` WHERE `status` = 'Y'), (SELECT `wallet_balance` FROM `wallet` WHERE `user_name` = (SELECT `user_name` FROM `user_details` WHERE `reffer_code`= (SELECT `reffer_by` FROM `user_details` WHERE `user_name` = ?))))",
                              [req.body.mobile, req.body.mobile])
                          }
                        })
                      } else {
                        res.status(200).send({
                          error: false,
                          status: true,
                          massage: "Wallet Update SuccessFully",
                        });
                      }
                    })
                  }
                })
            }
          }
        );
      }
    }
  );
});
app.post("/decline-deposit-request", verifytoken, (req, res) => {
  con.query(
    "UPDATE `deposit` SET `status`=?,`reason`=?,`Approved_declined_By`=? WHERE `id` = ?",
    ["Canceled", req.body.reason, req.body.username, req.body.id],
    (err, resultt) => {
      if (err) throw err;
      if (resultt) {
        res.status(200).send({
          error: false,
          status: true,
          massage: "Update Deatils SuccessFully",
        });
      }
    }
  );
});

app.post("/get-bank-details", verifytoken, (req, res) => {
  if (req.body.status === "Pending") {
    con.query(
      "SELECT * FROM `userbankdeatils` where `status`=?",
      [req.body.status],
      (err, result) => {
        if (err) throw err;
        if (result) {
          res.status(200).send({ error: false, status: true, data: result });
        }
      }
    );
  } else if (req.body.status === "Success") {
    con.query(
      "SELECT * FROM `userbankdeatils` where `status`=?",
      [req.body.status],
      (err, result) => {
        if (err) throw err;
        if (result) {
          res.status(200).send({ error: false, status: true, data: result });
        }
      }
    );
  } else if (req.body.status === "Canceled") {
    con.query(
      "SELECT * FROM `userbankdeatils` where `status`=?",
      [req.body.status],
      (err, result) => {
        if (err) throw err;
        if (result) {
          res.status(200).send({ error: false, status: true, data: result });
        }
      }
    );
  } else {
    con.query("SELECT * FROM `userbankdeatils`", (err, result) => {
      if (err) throw err;
      if (result) {
        res.status(200).send({ error: false, status: true, data: result });
      }
    });
  }
});
app.post("/approve-bank-details", verifytoken, (req, res) => {
  con.query(
    "UPDATE `userbankdeatils` SET `status`='Success',`approved_or_denied_by`=? WHERE `id` = ?",
    [req.body.username, req.body.id],
    (error, result) => {
      if (error) throw error;
      if (result) {
        res.status(200).send({
          error: false,
          status: true,
          massage: "Approved Bank SuccessFully",
        });
      }
    }
  );
});
app.post("/decline-bank-details", verifytoken, (req, res) => {
  con.query(
    "UPDATE `userbankdeatils` SET `status`=?,`reason`=?,`approved_or_denied_by`=? WHERE `id` = ?",
    ["Canceled", req.body.reason, req.body.username, req.body.id],
    (err, resultt) => {
      if (err) throw err;
      if (resultt) {
        res.status(200).send({
          error: false,
          status: true,
          massage: "Decline Bank Details!",
        });
      }
    }
  );
});

app.post("/get-withdrawal-request", verifytoken, (req, res) => {
  if (req.body.status === "Pending") {
    con.query(
      "SELECT w.id,w.user_name,w.balance,w.reason,w.Approved_declined_By,b.account_no,b.account_holder_name,b.account_type,b.bankname,b.ifsc_code,upi.name as upiname,upi.UPI_id,num.name,num.number,w.paytype,W.status,w.date  FROM  the_laundry_walas.withdrawal as w left JOIN  the_laundry_walas.userbankdeatils as b ON CASE WHEN w.paytype = 'Bank Transfer' THEN w.paymethod_id = b.id ELSE NULL END left JOIN  the_laundry_walas.userupidetails as upi ON CASE WHEN w.paytype = 'UPI Id' THEN w.paymethod_id = upi.id ELSE NULL END left JOIN  the_laundry_walas.usernumberdetails as num ON CASE WHEN w.paytype = 'Number' THEN w.paymethod_id = num.id ELSE NULL END where w.status='Pending'",
      (err, result) => {
        if (err) throw err;
        if (result) {
          res.status(200).send({ error: false, status: true, data: result });
        }
      }
    );
  } else if (req.body.status === "Success") {
    con.query(
      "SELECT w.id,w.user_name,w.balance,w.reason,w.Approved_declined_By,b.account_no,b.account_holder_name,b.account_type,b.bankname,b.ifsc_code,upi.name as upiname,upi.UPI_id,num.name,num.number,w.paytype,W.status,w.date  FROM  the_laundry_walas.withdrawal as w left JOIN  the_laundry_walas.userbankdeatils as b ON CASE WHEN w.paytype = 'Bank Transfer' THEN w.paymethod_id = b.id ELSE NULL END left JOIN  the_laundry_walas.userupidetails as upi ON CASE WHEN w.paytype = 'UPI Id' THEN w.paymethod_id = upi.id ELSE NULL END left JOIN  the_laundry_walas.usernumberdetails as num ON CASE WHEN w.paytype = 'Number' THEN w.paymethod_id = num.id ELSE NULL END where w.status='Success'",
      (err, result) => {
        if (err) throw err;
        if (result) {
          res.status(200).send({ error: false, status: true, data: result });
        }
      }
    );
  } else if (req.body.status === "Canceled") {
    con.query(
      "SELECT w.id,w.user_name,w.balance,w.reason,w.Approved_declined_By,b.account_no,b.account_holder_name,b.account_type,b.bankname,b.ifsc_code,upi.name as upiname,upi.UPI_id,num.name,num.number,w.paytype,W.status,w.date  FROM  the_laundry_walas.withdrawal as w left JOIN  the_laundry_walas.userbankdeatils as b ON CASE WHEN w.paytype = 'Bank Transfer' THEN w.paymethod_id = b.id ELSE NULL END left JOIN  the_laundry_walas.userupidetails as upi ON CASE WHEN w.paytype = 'UPI Id' THEN w.paymethod_id = upi.id ELSE NULL END left JOIN  the_laundry_walas.usernumberdetails as num ON CASE WHEN w.paytype = 'Number' THEN w.paymethod_id = num.id ELSE NULL END where w.status='Canceled'",
      (err, result) => {
        if (err) throw err;
        if (result) {
          res.status(200).send({ error: false, status: true, data: result });
        }
      }
    );
  } else {
    con.query(
      "SELECT w.id,w.user_name,w.balance,w.reason,w.Approved_declined_By,b.account_no,b.account_holder_name,b.account_type,b.bankname,b.ifsc_code,upi.name as upiname,upi.UPI_id,num.name,num.number,w.paytype,W.status,w.date FROM  the_laundry_walas.withdrawal as w left JOIN  the_laundry_walas.userbankdeatils as b ON CASE WHEN w.paytype = 'Bank Transfer' THEN w.paymethod_id = b.id ELSE NULL END left JOIN  the_laundry_walas.userupidetails as upi ON CASE WHEN w.paytype = 'UPI Id' THEN w.paymethod_id = upi.id ELSE NULL END left JOIN  the_laundry_walas.usernumberdetails as num ON CASE WHEN w.paytype = 'Number' THEN w.paymethod_id = num.id ELSE NULL END",
      (err, result) => {
        if (err) throw err;
        if (result) {
          res.status(200).send({ error: false, status: true, data: result });
        }
      }
    );
  }
});
app.post("/approve-withdrawal-request", verifytoken, (req, res) => {
  con.query(
    "UPDATE `withdrawal` SET `Approved_declined_By`=?,`status`='Success' WHERE `id`=? AND `user_name`=?",
    [req.body.username, req.body.id, req.body.mobile],
    (error, result) => {
      if (error) throw error;
      if (result) {
        con.query("INSERT INTO `statement`(`username`,`bet_or_type`, `bet_from`, `bet_balance`, `total_balance`) VALUES ('Withdrawal','Winning Wallet',(SELECT `balance` FROM `withdrawal` WHERE `id`=?),(SELECT `wallet_balance` FROM `wallet` WHERE `user_name` = ?))", [req.body.mobile, req.body.mobile], (errr, resu) => {
          if (errr) {
            throw errr;
          }
          if (resu) {
            res.status(200).send({
              error: false,
              status: true,
              massage: "Approved User Details SuccessFully",
            });
          }
        })
      }
    }
  );
});
app.post("/decline-withdrawal-request", verifytoken, (req, res) => {
  con.query(
    "UPDATE `withdrawal` SET `reason`=?,`Approved_declined_By`=?,`status`='Canceled' WHERE `id`=?",
    [req.body.reason, req.body.username, req.body.id],
    (err, resultt) => {
      if (err) throw err;
      if (resultt) {
        con.query(
          "UPDATE `wallet` SET `wallet_balance`=wallet_balance+(SELECT `balance` FROM `withdrawal` WHERE `id`=?) WHERE `user_name`=(SELECT `user_name` FROM `withdrawal` WHERE `id`=?);",
          [req.body.id, req.body.id],
          (err, resultt) => {
            if (err) throw err;
            if (resultt) {
              res.status(200).send({
                error: false,
                status: true,
                massage: "Wallet Update SuccessFully",
              });
            }
          }
        );
      }
    }
  );
});

app.post("/add-shopping-details", upload.single("s_image"), verifytoken, (req, res) => {
  con.query(
    "INSERT INTO `items`( `item_image`, `item_oprice`, `item_dprice`) VALUES (?,?,?)",
    [req.file.filename, req.body.oprice, req.body.dprice],
    (err, result) => {
      if (err) {
        throw err;
      }
      if (result) {
        res.status(200).send({
          error: false,
          status: true,
          massage: "Added Details SuccessFully",
        });
      }
    }
  );
});
app.post('/get-shopping-details', verifytoken, (req, res) => {
  con.query('SELECT * FROM `items`', (err, result) => {
    if (err) throw err;
    if (result) {
      res.status(200).send({ error: false, status: true, data: result })
    }
  })
})

// BONUS Reffer 
app.post("/add-reffer-details", verifytoken, (req, res) => {
  con.query(
    "INSERT INTO `reffer_bonus`(`reffer_by`, `reffer_to`) VALUES (?,?)",
    [req.body.reffer_by, req.body.reffer_to],
    (err, result) => {
      if (err) {
        throw err;
      }
      if (result) {
        res.status(200).send({
          error: false,
          status: true,
          massage: "Added Reffer Details SuccessFully",
        });
      }
    }
  );
});
app.post('/get-reffer-details', verifytoken, (req, res) => {
  con.query('SELECT * FROM `reffer_bonus`', (err, result) => {
    if (err) throw err;
    if (result) {
      res.status(200).send({ error: false, status: true, data: result })
    }
  })
})
app.post("/update-reffer-details", (req, res) => {
  con.query(
    "UPDATE `reffer_bonus` SET `reffer_by`=?,`reffer_to`=? WHERE `id`= ? ",
    [req.body.reffer_by, req.body.reffer_to, req.body.id],
    (err, result) => {
      if (err) {
        throw err;
      } if (result) {
        res.status(200).send({
          error: false,
          status: true,
          massage: "Update Details SuccessFully",
        });
      }
    }
  );
});
app.post("/del-reffer-details", verifytoken, (req, res) => {
  con.query(
    "DELETE FROM `reffer_bonus` where id=?",
    [req.body.id],
    (err, result) => {
      if (err) throw err;
      if (result) {
        res.status(200).json({
          error: false,
          status: true,
          massage: "Your Details has been deleted.",
        });
      }
    }
  );
});
app.post("/status-reffer-details", verifytoken, (req, res) => {
  con.query(
    "UPDATE `reffer_bonus` SET `status`='N' WHERE `status`= 'Y'",
    (err, result) => {
      if (err) throw err;
      if (result) {
        con.query(
          "UPDATE `reffer_bonus` SET `status`=? WHERE `id`= ?",
          [req.body.status, req.body.id],
          (err, result) => {
            if (err) throw err;
            if (result) {
              res.status(200).json({
                error: false,
                status: true,
                massage: "Status Changed SuccessFully",
              });
            }
          }
        );
      }
    }
  );
});

// BONUS Offer 
app.post("/add-offer-details", verifytoken, (req, res) => {
  con.query("select * from `payment_bonus` where `offer_name` = ?", [req.body.offer_name], (err, results) => {
    if (err) {
      throw err;
    } if (results.length > 0) {
      res.status(302).send({
        error: true,
        status: false,
        massage: "Offer name is Already Exist",
      });
    } else {
      con.query(
        "INSERT INTO `payment_bonus`(`offer_name`, `percentage`, `amount_start`, `amount_end`, `times`, `end_date`) VALUES (?,?,?,?,?,?)",
        [req.body.offer_name, req.body.percentage, req.body.amount_from, req.body.amount_to, req.body.times, req.body.end_date],
        (err, result) => {
          if (err) {
            throw err;
          }
          if (result) {
            res.status(200).send({
              error: false,
              status: true,
              massage: "Added Offer Details SuccessFully",
            });
          }
        }
      );
    }
  })
});
app.post('/get-offer-details', verifytoken, (req, res) => {
  con.query('SELECT * FROM `payment_bonus`', (err, result) => {
    if (err) throw err;
    if (result) {
      res.status(200).send({ error: false, status: true, data: result })
    }
  })
})
app.post("/update-offer-details", (req, res) => {
  con.query(
    "UPDATE `payment_bonus` SET `offer_name`=?,`percentage`=?, `amount_start` = ?, `amount_end` = ?,`times`=?,`end_date`=? WHERE `id` = ?",
    [req.body.offer_name, req.body.percentage, req.body.amount_from, req.body.amount_to, req.body.times, req.body.end_date, req.body.id],
    (err, result) => {
      if (err) {
        if (err.code == "ER_DUP_ENTRY") {
          res.status(302).send({
            error: true,
            status: false,
            massage: "Offer Name is already exist",
          });
        }
      } if (result) {
        res.status(200).send({
          error: false,
          status: true,
          massage: "Update Details SuccessFully",
        });
      }
    }
  );
});
app.post("/del-offer-details", verifytoken, (req, res) => {
  con.query(
    "DELETE FROM `payment_bonus` where id=?",
    [req.body.id],
    (err, result) => {
      if (err) throw err;
      if (result) {
        res.status(200).json({
          error: false,
          status: true,
          massage: "Your Details has been deleted.",
        });
      }
    }
  );
});
app.post("/status-offer-details", verifytoken, (req, res) => {
  con.query(
    "UPDATE `payment_bonus` SET `status`=? WHERE `id`= ?",
    [req.body.status, req.body.id],
    (err, result) => {
      if (err) throw err;
      if (result) {
        res.status(200).json({
          error: false,
          status: true,
          massage: "Status Changed SuccessFully",
        });
      }
    }
  );
});

// order
app.post("/add-order", verifytoken, (req, res) => {
  var data = req.body.data;
  const bearer = '00:00:00';
  con.query(
    "select * from `order` where `order_no`=?",
    [data.order_no],
    (err, result) => {
      if (err) throw err;
      if (result.length > 0) {
        res.status(404).json({
          error: true,
          status: false,
          message: "Order Number is Already Exist!",
        });
      } else {
        con.query("INSERT INTO `order`(`user_id`, `order_type`, `order_no`, `order_date`, `order_time`,`pickup_addess`,`status`, `date`,`order_schedule`) VALUES (?,?,?,?,?,?,'Y',?,?)", [data.order_user[0].id, data.order_type, data.order_no, data.order_pdate, bearer, data.order_address, data.order_date, data.order_schedule], (err, result) => {
          if (err) throw err;
          if (result) {
            res.status(200).json({
              error: false,
              status: true,
              massage: "SuccessFully Added Order Details",
            });
          }
        })
      }
    })
})
app.post('/get-order', verifytoken, (req, res) => {
  con.query("SELECT o.*,u.name,u.email,u.phone FROM `order` as o INNER join user_details as u on o.user_id = u.id ORDER BY `id` DESC;", (err, result) => {
    if (err) throw err;
    if (result) {
      res.status(200).json({ error: false, status: true, data: result });
    }
  })
})
app.post("/del-order", verifytoken, (req, res) => {
  con.query("DELETE FROM `order_bill` WHERE `order_no` = ?", [req.body.id], (err, result) => {
    if (err) throw err;
    if (result) {
      con.query("DELETE FROM `order` WHERE `order_no` = ?", [req.body.id], (err, result) => {
        if (err) throw err;
        if (result) {
          res.status(200).send({ error: false, status: true, massage: 'Your User has been Deleted SuccessFully' })
        }
      })
    }
  })
})
app.post("/status-order-schedule", verifytoken, (req, res) => {
  console.log(req.body);
  con.query("UPDATE `order` SET `order_schedule`=? WHERE `order_no` = ?",
    [req.body.status, req.body.id],
    (err, result) => {
      if (err) throw err;
      if (result) {
        res.status(200).json({
          error: false,
          status: true,
          massage: "Your Order Scheduled Status has been Changed SuccessFully",
        });
      }
    }
  );
});

app.post('/get-price-by-cat', verifytoken, (req, res) => {
  con.query("SELECT * FROM `price_list` WHERE `item_catagory` = ?", [req.body.id], (err, result) => {
    if (err) throw err;
    if (result) {
      res.status(200).json({ error: false, status: true, data: result });
    }
  })
})
app.post("/get-current-time", verifytoken, (req, res) => {
  res.status(200).json({ error: false, status: true, currentTime: new Date() });
});
app.post("/get-bill-details", verifytoken, (req, res) => {
  con.query("SELECT  ob.id,ob.price_list_id as price_id,pl.item_name,ic.item_catagory as cat_name,ob.qty,ob.price,pl.unit,ob.total,ob.date FROM `order_bill` as ob INNER join price_list as pl on pl.id = ob.`price_list_id` INNER join items_catagory as ic on pl.item_catagory = ic.id where `order_no` = ?", [req.body.order_no], (err, result) => {
    if (err) throw err;
    if (result) {
      res.status(200).json({ error: false, status: true, data: result });
    }
  })
})
app.post("/add-bill-details", verifytoken, (req, res) => {
  for (var data of req.body.data) {
    con.query("INSERT INTO `order_bill`(`order_no`, `price_list_id`, `price`, `qty`,`total`) VALUES (?,?,?,?,?)", [req.body.array.order_no, data.price_id, data.price, data.qty, data.price * data.qty]);
  }
  var a = req.body.array;
  if (a.gst == false) {
    con.query("UPDATE `order` SET `total_bill` = ?, `advanced_a` = ?, `due` = ?,`delivery` = ?, final_total = ?, `discount`= ?, `gst` = 'N', `bill_genrate` = 'Y' WHERE `order_no` = ?", [a.grand_total, a.advanced_amount, a.due_amount, a.delivery, a.final_amount, a.discount_percentage, a.order_no], (err, result) => {
      if (err) throw err;
      if (result) {
        res.status(200).json({
          error: false,
          status: true,
          message: "Add Order Details"
        })
      }
    });
  } else {
    con.query("UPDATE `order` SET `total_bill` = ?, `advanced_a` = ?, `due` = ?,`delivery` = ?, final_total = ?, `discount`= ?, `gst` = 'Y', `bill_genrate` = 'Y' WHERE `order_no` = ?", [a.grand_total, a.advanced_amount, a.due_amount, a.delivery, a.final_amount, a.discount_percentage, a.order_no], (err, result) => {
      if (err) throw err;
      if (result) {
        res.status(200).json({
          error: false,
          status: true,
          message: "Add Order Details"
        })
      }
    });
  }
})
app.post("/update-bill-details", verifytoken, (req, res) => {
  con.query("SELECT * FROM `order_bill` WHERE `order_no` = ?", [req.body.order_no.order_no], (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      con.query("DELETE FROM `order_bill` WHERE `order_no` = ?", [req.body.order_no.order_no], (err, result) => {
        if (err) throw err;
        if (result) {
          for (var data of req.body.data) {
            con.query("INSERT INTO `order_bill`(`order_no`, `price_list_id`, `price`, `qty`,`total`) VALUES (?,?,?,?,?)", [req.body.order_no.order_no, data.price_id, data.price, data.qty, data.price * data.qty])
          }
          var a = req.body.order_no;
          if (a.gst == false) {
            con.query("UPDATE `order` SET `total_bill` = ?, `advanced_a` = ?, `due` = ?,`delivery`=?, final_total = ?, `discount`= ?, `gst` = 'N', `bill_genrate` = 'Y' WHERE `order_no` = ?", [a.grand_total, a.advanced_amount, a.due_amount, a.delivery, a.final_amount, a.discount_percentage, a.order_no], (err, result) => {
              if (err) throw err;
              if (result) {
                res.status(200).json({
                  error: false,
                  status: true,
                  message: "Update Order Details!"
                })
              }
            });
          } else {
            con.query("UPDATE `order` SET `total_bill` = ?, `advanced_a` = ?, `due` = ?,`delivery` = ?, final_total = ?, `discount`= ?, `gst` = 'Y', `bill_genrate` = 'Y' WHERE `order_no` = ?", [a.grand_total, a.advanced_amount, a.due_amount, a.delivery, a.final_amount, a.discount_percentage, a.order_no], (err, result) => {
              if (err) throw err;
              if (result) {
                res.status(200).json({
                  error: false,
                  status: true,
                  message: "Update Order Details!"
                })
              }
            });
          }
        }
      })
    } else {
      for (var data of req.body.data) {
        con.query("INSERT INTO `order_bill`(`order_no`, `price_list_id`, `price`, `qty`,`total`) VALUES (?,?,?,?,?)", [req.body.order_no.order_no, data.price_id, data.price, data.qty, data.price * data.qty])
      }
      var a = req.body.order_no;
      if (a.gst == false) {
        con.query("UPDATE `order` SET `total_bill` = ?, `advanced_a` = ?, `due` = ?,`delivery` = ?, final_total = ?, `discount`= ?, `gst` = 'N', `bill_genrate` = 'Y' WHERE `order_no` = ?", [a.grand_total, a.advanced_amount, a.due_amount, a.delivery, a.final_amount, a.discount_percentage, a.order_no], (err, result) => {
          if (err) throw err;
          if (result) {
            res.status(200).json({
              error: false,
              status: true,
              message: "Update Order Details!"
            })
          }
        });
      } else {
        con.query("UPDATE `order` SET `total_bill` = ?, `advanced_a` = ?, `due` = ?, `delivery` = ?, final_total = ?, `discount`= ?, `gst` = 'Y', `bill_genrate` = 'Y' WHERE `order_no` = ?", [a.grand_total, a.advanced_amount, a.due_amount, a.delivery, a.final_amount, a.discount_percentage, a.order_no], (err, result) => {
          if (err) throw err;
          if (result) {
            res.status(200).json({
              error: false,
              status: true,
              message: "Update Order Details!"
            })
          }
        });
      }
    }
  })
})
app.post("/update-bill-status", verifytoken, (req, res) => {
  if (req.body.status == 'C') {
    con.query(
      "UPDATE `order` SET `status`=?,`bill_genrate`=? WHERE `order_no`= ?",
      [req.body.status, req.body.status, req.body.order_no],
      (err, result) => {
        if (err) throw err;
        if (result) {
          res.status(200).json({
            error: false,
            status: true,
            massage: "Status Changed SuccessFully",
          });
        }
      }
    );
  } else {
    con.query("select `bill_genrate` as bg from `order` where `order_no`=?",
      [req.body.order_no],
      (err, result) => {
        if (err) throw err;
        if (result[0].bg == 'C') {
          con.query("UPDATE `order` SET `status`=?,`bill_genrate`= ? WHERE `order_no`= ?",
            [req.body.status, 'N', req.body.order_no],
            (err, result) => {
              if (err) throw err;
              if (result) {
                res.status(200).json({
                  error: false,
                  status: true,
                  massage: "Status Changed SuccessFully",
                });
              }
            }
          );
        } else {
          con.query("UPDATE `order` SET `status`=? WHERE `order_no`= ?",
            [req.body.status, req.body.order_no],
            (err, result) => {
              if (err) throw err;
              if (result) {
                res.status(200).json({
                  error: false,
                  status: true,
                  message: "Status Changed SuccessFully",
                });
              }
            }
          );
        }
      })
  }
})

// add-user-deatils
app.post("/add-user-deatils", verifytoken, (req, res) => {
  con.query(
    "INSERT INTO `user_details`(`name`, `email`,`phone`) VALUES (?,?,?)",
    [req.body.name, req.body.email, req.body.phone],
    (err, result) => {
      if (err) throw err;
      if (result) {
        con.query(
          "INSERT INTO `wallet`(`email`, `wallet_balance`) VALUES (?,?)",
          [req.body.email, 0], (ab, ba) => {
            if (ab) { throw ab }
            if (ba) {
              res.status(200).json({
                error: false,
                status: true,
                message: "Registered Successfully",
              });
            }
          }
        );
      }
    }
  );
})

app.post("/update-user-deatils", verifytoken, (req, res) => {
  con.query("select * from user_details where `email`=?",
    [req.body.email], (err, result) => {
      if (err) throw err;
      if (result.length > 0) {
        res.status(404).json({
          error: true,
          status: false,
          message: "Email Id is Already Exist!",
        });
      } else {
        con.query("INSERT INTO `user_details`(`name`, `email`,`phone`) VALUES (?,?,?)",
          [req.body.name, req.body.email, req.body.phone], (err, result) => {
            if (err) throw err;
            if (result) {
              con.query(
                "INSERT INTO `wallet`(`email`, `wallet_balance`) VALUES (?,?)",
                [req.body.email, 0], (ab, ba) => {
                  if (ab) { throw ab }
                  if (ba) {
                    res.status(200).json({
                      error: false,
                      status: true,
                      message: "Registered Successfully",
                    });
                  }
                }
              );
            }
          }
        );
      }
    }
  );
})

//Total Cost
app.post("/add-total-cost", verifytoken, (req, res) => {
  con.query(
    "INSERT INTO `total_cost`(`item_name`, `type`, `cost`, `discription`, `date`) VALUES (?,?,?,?,?)",
    [req.body.name, req.body.type, req.body.cost, req.body.discription, req.body.date],
    (err, result) => {
      if (err) throw err;
      if (result) {
        res.status(200).json({
          error: false,
          status: true,
          message: "Added Details Successfully",
        });
      }
    }
  );
})
app.post("/update-total-cost", verifytoken, (req, res) => {
  con.query(
    "UPDATE `total_cost` SET `item_name`=?, `type`=?, `cost`=?, `discription`=?,`date`=? WHERE `id` = ?",
    [req.body.name, req.body.type, req.body.cost, req.body.discription, req.body.date, req.body.id], (ab, ba) => {
      if (ab) { throw ab }
      if (ba) {
        res.status(200).json({
          error: false,
          status: true,
          message: "Details Upadated Successfully",
        });
      }
    }
  );
})
app.post("/get-total-cost", verifytoken, (req, res) => {
  con.query("SELECT * FROM `total_cost`", (err, result) => {
    if (err) throw err;
    if (result) {
      res.status(200).json({ error: false, status: true, data: result });
    }
  })
})
app.post("/del-total-cost", verifytoken, (req, res) => {
  con.query("DELETE FROM `total_cost` WHERE `id` = ?", [req.body.id], (err, result) => {
    if (err) throw err;
    if (result) {
      res.status(200).send({ error: false, status: true, massage: 'Your Details has been Deleted SuccessFully' })
    }
  })
})

function verifytoken(req, res, next) {
  const bearerHeader = req.headers["authorization"];
  if (typeof bearerHeader !== "undefined") {
    const bearer = bearerHeader.split(" ");
    const bearerToken = bearer[1];
    req.token = bearerToken;
    jwt.verify(req.token, process.env.SECRET_KEY_ADMIN, (err, auth) => {
      if (err) {
        jwt.verify(
          req.token,
          process.env.SECRET_KEY_SUPERADMIN,
          (err, auth) => {
            if (err) {
              res.status(403).send('Token Expire');
            } else {
              if (auth.username != req.body.username) {
                res.status(403).send("false");
              } else {
                next();
              }
            }
          }
        );
      } else {
        if (auth.username != req.body.username) {
          res.status(403).send("false");
        } else {
          next();
        }
      }
    });
  } else {
    res.sendStatus(403);
  }
}
module.exports = app;
