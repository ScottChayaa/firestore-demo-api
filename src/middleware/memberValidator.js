const { check } = require('express-validator');

/**
 * 驗證器: Member
 */
class MemberValidator {

  /**
   * 驗證: uid
   */
  uid = () => check("uid").notEmpty().withMessage("uid 為必填欄位");

  /**
   * 驗證: name
   */
  name = () => check("name").notEmpty().withMessage("name 為必填欄位");
}

var memberValidator = new MemberValidator();


module.exports = {
  memberValidator
};
