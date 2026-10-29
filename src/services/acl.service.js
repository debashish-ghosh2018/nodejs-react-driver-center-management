const { Permission, RolePermission } = require("../models");

/*
const seed = [
    ["dashboard.view","View dashboard","dashboard"],
    ["customers.view","View customers","customers"],
    ["customers.create","Create customers","customers"],
    ["customers.update","Update customers","customers"],
    ["customers.delete","Delete customers","customers"],
    ["drivers.view","View drivers","drivers"],
    ["drivers.create","Create drivers","drivers"],
    ["drivers.update","Update drivers","drivers"],
    ["drivers.delete","Delete drivers","drivers"],
    ["vehicles.view","View vehicles","vehicles"],
    ["vehicles.create","Create vehicles","vehicles"],
    ["vehicles.update","Update vehicles","vehicles"],
    ["vehicles.delete","Delete vehicles","vehicles"],
    ["bookings.view","View bookings","bookings"],
    ["bookings.create","Create bookings","bookings"],
    ["bookings.update","Update bookings","bookings"],
    ["bookings.assign","Assign drivers","bookings"],
    ["payments.view","View payments","payments"],
    ["payments.create","Create payments","payments"],
    ["reports.view","View reports","reports"],
    ["users.manage","Manage users","users"],
    ["settings.manage","Manage Application Settings","appsetting"],
    ["acl.manage","Manage ACL","acl"]
];
*/

const seed = [
  /*
   * =====================================================
   * DASHBOARD
   * =====================================================
   */
  ["dashboard.view","View dashboard","dashboard"],
  /*
   * =====================================================
   * CUSTOMERS
   * =====================================================
   */
  ["customers.view","View customers","customers"],
  ["customers.create","Create customers","customers"],
  ["customers.update","Update customers","customers"],
  ["customers.delete","Delete customers","customers"],
  ["customers.manage_login","Manage customer login account","customers"],
  /*
   * =====================================================
   * DRIVERS
   * =====================================================
   */
  ["drivers.view","View drivers","drivers"],
  ["drivers.create","Create drivers","drivers" ],
  ["drivers.update","Update drivers","drivers"],
  ["drivers.delete","Delete drivers","drivers"],
  ["drivers.manage_login","Manage driver login account","drivers"],
  ["drivers.availability","Update driver availability","drivers"],
  ["drivers.location","View driver location","drivers"],
  /*
   * =====================================================
   * VEHICLES
   * =====================================================
   */
  ["vehicles.view","View vehicles","vehicles"],
  ["vehicles.create","Create vehicles","vehicles"],
  ["vehicles.update","Update vehicles","vehicles"],
  ["vehicles.delete","Delete vehicles","vehicles"],
  /*
   * =====================================================
   * VEHICLE TYPES
   * =====================================================
   */
  ["vehicle_types.view","View vehicle types","vehicle types"],
  ["vehicle_types.create","Create vehicle types","vehicle types"],
  ["vehicle_types.update","Update vehicle types","vehicle types"],
  ["vehicle_types.delete","Delete vehicle types","vehicle types"],
  /*
   * =====================================================
   * BOOKINGS
   * =====================================================
   */
  ["bookings.view","View bookings","bookings"],
  ["bookings.create","Create bookings","bookings"],
  ["bookings.update","Update bookings","bookings"],
  ["bookings.delete","Delete bookings","bookings"],
  ["bookings.assign","Assign driver and vehicle","bookings"],
  ["bookings.status","Update booking status","bookings"],
  ["bookings.cancel","Cancel bookings","bookings"],
  ["bookings.commission","Manage booking driver commission","bookings"],
  ["bookings.outstation","Manage outstation bookings","bookings"],
  /*
   * =====================================================
   * PAYMENTS
   * =====================================================
   */
  ["payments.view","View payments","payments"],
  ["payments.create","Create payments","payments"],
  ["payments.update","Update payments","payments"],
  ["payments.delete","Delete payments","payments"],
  ["payments.refund","Process payment refunds","payments"],
  /*
   * =====================================================
   * DRIVER EARNINGS
   * =====================================================
   */
  ["earnings.view","View driver earnings","earnings"],
  ["earnings.create","Create driver earnings","earnings"],
  ["earnings.update","Update driver earnings","earnings"],
  ["earnings.approve","Approve driver earnings","earnings"],
  ["earnings.pay","Mark driver earnings as paid","earnings"],
  /*
   * =====================================================
   * RATINGS / REVIEWS
   * =====================================================
   */
  ["ratings.view","View ratings and reviews","ratings"],
  ["ratings.update","Update ratings and reviews","ratings"],
  ["ratings.delete","Delete ratings and reviews","ratings"],
  /*
   * =====================================================
   * NOTIFICATIONS
   * =====================================================
   */
  ["notifications.view","View notifications","notifications"],
  ["notifications.send","Send notifications","notifications"],
  ["notifications.delete","Delete notifications","notifications"],
  /*
   * =====================================================
   * REPORTS
   * =====================================================
   */
  ["reports.view","View reports","reports"],
  ["reports.bookings","View booking reports","reports"],
  ["reports.revenue","View revenue reports","reports"],
  ["reports.drivers","View driver reports","reports"],
  ["reports.customers","View customer reports","reports"],
  ["reports.payments","View payment reports","reports"],
  ["reports.earnings","View driver earning reports","reports"],
  ["reports.export","Export reports","reports"],
  /*
   * =====================================================
   * USER MANAGEMENT
   * =====================================================
   */
  ["users.view","View users","users"],
  ["users.create","Create users","users"],
  ["users.update","Update users","users"],
  ["users.delete","Delete users","users"],
  ["users.reset_password","Reset user password","users"],
  ["users.status","Activate or deactivate users","users"],
  ["users.manage","Manage users","users"],
  /*
   * =====================================================
   * APPLICATION SETTINGS
   * =====================================================
   */
  ["settings.view","View application settings","appsetting"],
  ["settings.general","Manage general application settings","appsetting"],
  ["settings.notifications","Manage notification settings","appsetting"],
  ["settings.email","Manage email settings","appsetting"],
  ["settings.sms","Manage SMS settings","appsetting"],
  ["settings.whatsapp","Manage WhatsApp settings","appsetting"],
  ["settings.commission","Manage default driver commission settings","appsetting"],
  ["settings.manage","Manage application settings","appsetting"],
  /*
   * =====================================================
   * ACL / ROLE MANAGEMENT
   * =====================================================
   */
  ["acl.view","View ACL configuration","acl"],
  ["acl.manage","Manage ACL","acl"],
  /*
   * =====================================================
   * AUDIT LOG
   * =====================================================
   */
  ["audit.view","View audit logs","audit"],
  ["audit.export","Export audit logs","audit"]
];


async function seedAcl(){

    //console.log("Permission model:", Permission);
    //console.log("RolePermission model:", RolePermission);

    for(const [code,name,module] of seed) await Permission.findOrCreate({where:{code},defaults:{name,module}});

    const defaults = {
        ADMIN:seed.filter(x=>!["users.manage","acl.manage"].includes(x[0])).map(x=>x[0]),
        MANAGER:["dashboard.view","customers.view","customers.create","customers.update","drivers.view","drivers.create","drivers.update","vehicles.view","vehicles.create","vehicles.update","bookings.view","bookings.create","bookings.update","bookings.assign","payments.view","payments.create","reports.view"],
        STAFF:["dashboard.view","customers.view","customers.create","drivers.view","vehicles.view","bookings.view","bookings.create","payments.view"]
    };

    for(const [role,codes] of Object.entries(defaults)){ 
        for(const code of codes){ 
            const p=await Permission.findOne({where:{code}}); 
            if(p) await RolePermission.findOrCreate({where:{role,permissionId:p.id}}); 
        }
    }
}

module.exports={seedAcl};
