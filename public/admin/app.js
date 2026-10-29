"use strict";
const API = "/api";
const crudState = {};
let appCurrency = "INR";
let token = localStorage.getItem("dc_token");

const page = document.getElementById("page");
const loginView = document.getElementById("loginView");
const appView = document.getElementById("appView");

/*
|--------------------------------------------------------------------------
| CRUD CONFIGURATION
|--------------------------------------------------------------------------
*/
const crudConfigs = {
  customers: {
    title: "Customers",
    singularTitle: "Customer",
    endpoint: "/customers",
    permissionPrefix: "customers",
    searchPlaceholder: "Search by name, mobile, email or customer code...",
    columns: [
      {field: "customerCode", label: "Code"}, 
      {field: "name", label: "Name"}, 
      {field: "mobile", label: "Mobile"}, 
      {field: "email", label: "Email"}, 
      {field: "status", label: "Status", type: "status"}, 
      {field: "createdAt", label: "Created", type: "datetime"}
    ],
    fields: [
      {name: "name", label: "Name", type: "text", required: true}, 
      {name: "mobile", label: "Mobile", type: "text", required: true}, 
      {name: "email", label: "Email", type: "email"}, 
      {name: "address", label: "Address", type: "textarea"}, 
      {name: "status", label: "Status", type: "select", required: true, options: [{value: "ACTIVE", label: "Active"}, {value: "INACTIVE", label: "Inactive"}]}
    ],
    filters: [
      {name: "status", label: "Status", type: "select", options: [{value: "", label: "All Status"}, {value: "ACTIVE", label: "Active"}, {value: "INACTIVE", label: "Inactive"}]}
    ],
    deleteFilter: [{name: "isDeleted", value: 0}],
    sortOptions: [{value: "createdAt", label: "Created Date"}, {value: "name", label: "Name"}, {value: "customerCode", label: "Customer Code"}, {value: "status", label: "Status"}]
  },
  vehicles: {
    title: "Vehicles",
    singularTitle: "Vehicle",
    endpoint: "/vehicles",
    permissionPrefix: "vehicles",
    searchPlaceholder: "Search vehicle number, model, make...",
    columns: [
      {field: "vehicleNo", label: "Registration"}, 
      {field: "brand", label: "Make"}, 
      {field: "model", label: "Model"}, 
      {field: "vehicleType", label: "Type"}, 
      {field: "status", label: "Status", type: "status"}, 
      {field: "createdAt", label: "Created", type: "datetime"}
    ],
    fields: [
      {name: "vehicleNo", label: "Registration Number", type: "text", required: true}, 
      {name: "brand", label: "Make", type: "text"}, 
      {name: "model", label: "Model", type: "text"},
      {name: "year", label: "Year", type: "number"},
      {name: "insuranceExpiry", label: "Insurance Expiry", type: "date"},
      {name: "fitnessExpiry", label: "Fitness Expiry", type: "date"},  //{name: "vehicleType", label: "Vehicle Type", type: "text"}, 
      {name: "vehicleTypeId", label: "Vehicle Type", type: "ajaxselect", callingurl: "/vehicle-types?isDeleted=0&status=ACTIVE", displayField: ["code", "name", "seatingCapacity", "baseFare", "perKmRate"], displayFieldFormat: "{name} - {code} [Capacity: {seatingCapacity}, Base Fare: {baseFare}, Rate Per KM: {perKmRate}]", valueField: "id", required: true}, 
      {name: "status", label: "Status", type: "select", required: true, options: [{value: "ACTIVE", label: "Active"}, {value: "INACTIVE", label: "Inactive"}]}
    ],
    filters: [
      {name: "status", label: "Status", type: "select", options: [{value: "", label: "All Status"}, {value: "ACTIVE", label: "Active"}, {value: "INACTIVE", label: "Inactive"}]}
    ],
    deleteFilter: [{name: "isDeleted", value: 0}],
    sortOptions: [{value: "createdAt", label: "Created Date"}, {value: "vehicleNo", label: "Registration"}, {value: "brand", label: "Make"}, {value: "status", label: "Status"}]
  },
  vehicle_types: {
    title: "Vehicles Type",
    singularTitle: "Vehicle Type",
    endpoint: "/vehicle-types",
    permissionPrefix: "vehicle_types",
    searchPlaceholder: "Search vehicle type, seating capacity, rate per KM...",
    columns: [
      {field: "code", label: "Code"}, 
      {field: "name", label: "Type Name"}, 
      {field: "seatingCapacity", label: "Seating Capacity"}, 
      {field: "baseFare", label: "Base Fare"}, 
      {field: "perKmRate", label: "Rate Per KM"}, 
      {field: "status", label: "Status", type: "status"}, 
      {field: "createdAt", label: "Created", type: "datetime"}
    ],
    fields: [
      {name: "code", label: "Code", type: "text", required: true}, 
      {name: "name", label: "Type Name", type: "text", required: true}, 
      {name: "description", label: "Details", type: "textarea"}, 
      {name: "seatingCapacity", label: "Seating Capacity", type: "number", required: true}, 
      {name: "baseFare", label: "Base Fare", type: "text", required: true}, 
      {name: "perKmRate", label: "Rate Per KM", type: "text", required: true}, 
      {name: "status", label: "Status", type: "select", required: true, options: [{value: "ACTIVE", label: "Active"}, {value: "INACTIVE", label: "Inactive"}]}
    ],
    filters: [
      {name: "status", label: "Status", type: "select", options: [{value: "", label: "All Status"}, {value: "ACTIVE", label: "Active"}, {value: "INACTIVE", label: "Inactive"}]}
    ],
    deleteFilter: [{name: "isDeleted", value: 0}],
    sortOptions: [{value: "createdAt", label: "Created Date"}, {value: "name", label: "Type Name"}, {value: "seatingCapacity", label: "Seating Capacity"}, {value: "baseFare", label: "Base Fare"}, {value: "status", label: "Status"}]
  }
};

function showApp() {
  loginView.classList.add("d-none");
  appView.classList.remove("d-none");
  loadPage("dashboard");
}

function showLogin() {
  loginView.classList.remove("d-none");
  appView.classList.add("d-none");
}

/*
|--------------------------------------------------------------------------
| DATE/TIME FORMAT
|--------------------------------------------------------------------------
*/
function formatDateTime(value) {
  if(!value) {
    return "-";
  }
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) {
    return dcEscape(value);
  }
  return date.toLocaleString("en-IN", {day: "2-digit", month: "short",year: "numeric",hour: "2-digit",minute: "2-digit",hour12: true});
}

async function api(url, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(API + url, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  //if (!res.ok) throw new Error(data.message || "Request failed");
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: document.getElementById("email").value,
        password: document.getElementById("password").value
      })
    });
    token = data.token;
    localStorage.setItem("dc_token", token);
    showApp();
  } catch (err) {
    const el = document.getElementById("loginError");
    el.textContent = err.message;
    el.classList.remove("d-none");
  }
});

//document.getElementById("logout").addEventListener("click", e => {
//  e.preventDefault();
//  localStorage.removeItem("dc_token");
//  token = null;
//  showLogin();
//});

//document.querySelectorAll("[data-page]").forEach(a => {
//  a.addEventListener("click", e => {
//    e.preventDefault();

//    document.querySelectorAll("[data-page]").forEach(x => x.classList.remove("active"));
//    a.classList.add("active");
//    loadPage(a.dataset.page);
//  });
//});


/*
 * ==========================================
 * Admin Navigation
 * ==========================================
 */
document.querySelectorAll(".admin-nav").forEach(item => {
  item.addEventListener("click", async () => {
    const pageName = item.dataset.page;   //console.log("Navigating to page:", pageName);

    /*
     * Update active menu
     */
    document.querySelectorAll(".admin-nav").forEach(nav => {
      nav.classList.remove("active");
      if (nav.dataset.page === pageName) {
        nav.classList.add("active");
      }
    });

    /*
     * Close mobile sidebar
     */
    const mobileSidebar = document.getElementById("mobileSidebar");
    if (mobileSidebar) {
      const instance = bootstrap.Offcanvas.getInstance(mobileSidebar);
      if (instance) {
        instance.hide();
      }
    }

    /*
     * Load selected page
     */
    await loadPage(pageName);
  });
});


/*
 * ==========================================
 * Change Password
 * ==========================================
 */
document.querySelectorAll(".change-password-menu").forEach(button => {
  button.addEventListener("click",() => {
    document.querySelectorAll(".admin-nav").forEach(nav => {
      nav.classList.remove("active");
    });

    changePasswordForm();
  });
});

/*
 * ==========================================
 * Mobile logo -> Dashboard
 * ==========================================
 */
const mobileDashboardLink = document.getElementById("mobileDashboardLink");
if (mobileDashboardLink) {
  mobileDashboardLink.addEventListener("click", event => { 
    event.preventDefault(); 
    loadPage( "dashboard");
  });
}

/*
 * ==========================================
 * Logout
 * ==========================================
 */
const logoutModalElement = document.getElementById("logoutModal");
const logoutModal = new bootstrap.Modal(logoutModalElement);

document.querySelectorAll(".logout-btn").forEach(button => {
  button.addEventListener("click", () => {
    logoutModal.show();
  });
});

document.getElementById("confirmLogoutBtn").addEventListener("click", () => {
  /*
   * Change the key if your application
   * stores JWT under a different name.
   */
  //localStorage.removeItem("token");
  //localStorage.removeItem("user");

  logoutModal.hide();
  
  localStorage.removeItem("dc_token");
  token = null;
  showLogin();
});


async function loadPage(name) {   
  //console.log("Loading page:", name);
  
  try {
    if (name === "dashboard") return dashboard();
    if (name === "customers") return customersPage();   //crudPage("Customers", "/customers", ["name","mobile","email","city","status"]);
    if (name === "drivers") return driversPage();       //crudPage("Drivers", "/drivers", ["driverCode","name","mobile","licenseNo","availability","status","rating"]);
    if (name === "vehicles") return crudPage(name);     //crudPage("Vehicles", "/vehicles?isDeleted=0", ["vehicleNo","vehicleType","brand","model","status"]);
    if (name === "vehicle_types") return crudPage(name);
    if (name === "bookings") return bookingsPage();
    if (name === "payments") return crudPage("Payments", "/payments", ["bookingId","amount","paymentMode","paymentStatus","paymentDate"]);
    if (name === "reports") return reports();
    if (name === "users") return usersPage();
    if (name === "acl") return aclPage();
    if (name === "settings") return applicationSettingsPage();
    if (name === "change-password") return changePasswordPage();
  } catch (e) {
    page.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

async function dashboard() {
  const d = await api("/dashboard");  //console.log(d);
  page.innerHTML = `
    <div class="d-flex justify-content-between mb-4"><h2>Dashboard</h2><span class="text-muted">${new Date().toLocaleString()}</span></div>
    <div class="row g-3">
      ${kpi("Customers", d.customers, "bi-people")}
      ${kpi("Drivers", d.drivers, "bi-person-badge")}
      ${kpi("Available Drivers", d.availableDrivers, "bi-person-check")}
      ${kpi("Vehicles", d.vehicles, "bi-car-front")}
      ${kpi("Pending Bookings", d.pendingBookings, "bi-hourglass-split")}
      ${kpi("Active Bookings", d.activeBookings, "bi-calendar-check")}
      ${kpi("Completed Trips", d.completedBookings, "bi-check-circle")}
      ${kpi("Revenue", "₹" + d.revenue.toFixed(2), "bi-currency-rupee")}
    </div>`;
}

function kpi(title, value, icon) {
  return `<div class="col-md-3"><div class="card card-kpi shadow-sm"><div class="card-body">
    <div class="d-flex justify-content-between"><div><small class="text-muted">${title}</small><h3 class="mt-2">${value}</h3></div>
    <i class="bi ${icon} fs-1 text-primary"></i></div></div></div></div>`;
}

function dcLabelize(value) {
  return value.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/^./, s => s.toUpperCase());
}

function dcEscape(value) {
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function dcFields(title) {
  if (title === "Customers") return [
    {name:"name",required:true},
    {name:"mobile",required:true},
    {name:"email",type:"email"},
    {name:"address",type:"textarea"},
    {name:"city"},
    {name:"state"},
    {name:"pincode"},
    {name:"status",type:"select",options:["ACTIVE","INACTIVE"]}
  ];
  if (title === "Drivers") return [
    {name:"name",required:true},
    {name:"mobile",required:true},
    {name:"email",type:"email"},
    {name:"address",type:"textarea"},
    {name:"licenseNo",required:true},
    {name:"licenseExpiry",type:"date"},
    {name:"experienceYears",type:"number",step:"0.1"},
    {name:"availability",type:"select",options:["AVAILABLE","BUSY","OFFLINE"]},
    {name:"status",type:"select",options:["ACTIVE","INACTIVE","SUSPENDED"]}
  ];
  if (title === "Vehicles") return [
    {name:"vehicleNo",required:true},
    {name:"vehicleType",required:true},
    {name:"brand"},{name:"model"},
    {name:"year",type:"number"},
    {name:"insuranceExpiry",type:"date"},
    {name:"fitnessExpiry",type:"date"},
    {name:"status",type:"select",options:["ACTIVE","INACTIVE","MAINTENANCE"]}
  ];
  if (title === "Payments") return [
    {name:"bookingId",required:true},
    {name:"amount",required:true},
    {name:"paymentMode",required:true,type:"select",options:["CASH","UPI","CARD","BANK_TRANSFER"]},
    {name:"paymentStatus",required:true,type:"select",options:["PENDING","PAID","FAILED","REFUNDED"]},
    {name:"paymentDate",required:true,type:"date"}
  ];

  return [];
}

function dcRenderField(field, value) {
  const label = dcLabelize(field.name);
  if (field.type === "select") {
    return `<div class="col-md-6"><label class="form-label">${label}</label>
      <select class="form-select" name="${field.name}" ${field.required?"required":""}>
        <option value="">Select ${label}</option>
        ${field.options.map(o=>`<option value="${o}" ${String(value??"")===o?"selected":""}>${dcLabelize(o)}</option>`).join("")}
      </select></div>`;
  }
  if (field.type === "textarea") {
    return `<div class="col-12"><label class="form-label">${label}</label>
      <textarea class="form-control" rows="3" name="${field.name}">${dcEscape(value)}</textarea></div>`;
  }
  return `<div class="col-md-6"><label class="form-label">${label}</label>
    <input class="form-control" name="${field.name}" type="${field.type||"text"}"
      ${field.step?`step="${field.step}"`:""} value="${dcEscape(value)}" ${field.required?"required":""}></div>`;
}

function formatMoney(amount, currency = "INR") {
  /*
   * Convert incoming values safely.
   *
   * Sequelize DECIMAL fields are often
   * returned as strings, e.g. "1250.50".
   */
  const numericAmount = Number(amount);
  const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;
  /*
   * Validate currency.
   */
  const safeCurrency = currency || "INR";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: safeCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(safeAmount);
  } catch(error) {
    /*
     * Fallback if an invalid currency
     * code is supplied.
     */
    return `₹${safeAmount.toLocaleString(
            "en-IN",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        )}`;
  }
}


// ===================================================
//   Customer page related function
// ===================================================
/*
async function customersPage() {
  const [customers, users] = await Promise.all([api("/customers?isDeleted=0"), api("/admin/users")]);
  const userMap = new Map();

  users.forEach(user => {
    if (user.customerProfile) {
      userMap.set(
        user.customerProfile.id,
        user
      );
    }
  });
  //console.log(customers);

  page.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-3"><div><h2 class="mb-1">Customers</h2><p class="text-muted mb-0">Manage customer profiles and login accounts</p></div><button class="btn btn-primary" id="addCustomerBtn"><i class="bi bi-plus-lg me-1"></i>Add Customer</button></div><div class="card border-0 shadow-sm"><div class="card-body table-responsive"><table class="table table-hover align-middle"><thead><tr><th>Customer Code</th><th>Name</th><th>Mobile</th><th>City</th><th>Status</th><th>Login Account</th><th class="text-end">Actions</th></tr></thead><tbody>${ customers.data.map(customer => { const linkedUser =userMap.get(customer.id); return `<tr><td> ${dcEscape(customer.customerCode)} </td><td> ${dcEscape( customer.name )} </td><td> ${dcEscape(customer.mobile)} </td><td> ${dcEscape(customer.city)} </td><td><span class="badge ${ customer.status === "ACTIVE" ? "text-bg-success" : "text-bg-secondary" }"> ${dcEscape(customer.status)} </span></td><td> ${ linkedUser ? `<div><strong> ${dcEscape( linkedUser.email )} </strong></div><small class="text-muted"> ${dcEscape(linkedUser.status)} </small>` : `<span class="badge text-bg-warning">No Account</span>` }</td><td class="text-end text-nowrap"><button class="btn btn-sm btn-outline-primary customer-edit" data-id="${customer.id}"><i class="bi bi-pencil-square"></i>Edit</button> <button class="btn btn-sm btn-outline-danger customer-delete" data-id="${customer.id}"><i class="bi bi-trash"></i> Delete</button> ${ linkedUser ? `<button class="btn btn-sm btn-outline-dark customer-user-manage" data-user-id="${linkedUser.id}"><i class="bi bi-person-gear"></i>Manage Login</button>` : `<button class="btn btn-sm btn-outline-success customer-user-create" data-customer-id="${customer.id}"><i class="bi bi-person-plus"></i>Create Login</button>` } </td></tr>`; }).join("") } </tbody></table></div></div>`;

  document.getElementById("addCustomerBtn").addEventListener("click", () => { customerForm(); });
  document.querySelectorAll(".customer-edit").forEach(button => { 
    button.addEventListener("click", () => { 
      customerForm( Number(button.dataset.id));
    });
  });

  document.querySelectorAll(".customer-delete").forEach(button => { 
    button.addEventListener("click", () => { 
      removeCustomer(Number(button.dataset.id));
    });
  });  

  document.querySelectorAll(".customer-user-create").forEach(button => {
    button.addEventListener("click", () => {
      createCustomerLoginForm(Number(button.dataset.customerId));
    });
  });

  document.querySelectorAll(".customer-user-manage").forEach(button => {
    button.addEventListener("click", () => {
      userForm(Number(button.dataset.userId));
    });
  });
}

async function customerForm(id = null) {
  const editing = Boolean(id);
  let customer = {};

  if (editing) {
    try {
      customer = await api(`/customers/${id}`);
    } catch (error) {
      alert(error.message);
      return;
    }
  }

  page.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-3"><div><h2 class="mb-1"> ${editing ? "Edit Customer" : "Add Customer"} </h2><p class="text-muted mb-0"> ${editing ? `Update customer #${id}` : "Create a new customer profile"} </p></div><button type="button" class="btn btn-outline-secondary" id="customerBackBtn"><i class="bi bi-arrow-left me-1"></i>Back</button></div><div id="customerFormError" class="alert alert-danger d-none"></div><div class="card border-0 shadow-sm"><div class="card-body"><form id="customerForm" class="row g-3" novalidate><div class="col-md-6"><label class="form-label" for="customerName">Name<span class="text-danger">*</span></label><input type="text" class="form-control" id="customerName" name="name" value="${dcEscape(customer.name || "")}" minlength="2" required><div class="invalid-feedback">Customer name is required.</div></div><div class="col-md-6"><label class="form-label" for="customerMobile">Mobile<span class="text-danger">*</span></label><input type="text" class="form-control" id="customerMobile" name="mobile" value="${dcEscape(customer.mobile || "")}" minlength="8" maxlength="20" required><div class="invalid-feedback">A valid mobile number is required.</div></div><div class="col-md-6"><label class="form-label" for="customerEmail">Email</label><input type="email" class="form-control" id="customerEmail" name="email" value="${dcEscape(customer.email || "")}" ><div class="invalid-feedback">Enter a valid email address.</div></div><div class="col-md-6"><label class="form-label" for="customerStatus">Status</label><select class="form-select" id="customerStatus" name="status"><option value="ACTIVE" ${(customer.status || "ACTIVE") === "ACTIVE" ? "selected" : ""} >Active</option><option value="INACTIVE" ${ customer.status === "INACTIVE" ? "selected" : "" } >Inactive</option></select></div><div class="col-12"><label class="form-label" for="customerAddress">Address</label><textarea class="form-control" id="customerAddress" name="address" rows="3">${dcEscape(customer.address || "")}</textarea></div><div class="col-md-4"><label class="form-label" for="customerCity">City</label><input type="text" class="form-control" id="customerCity" name="city" value="${dcEscape(customer.city || "")}"></div><div class="col-md-4"><label class="form-label" for="customerState">State</label><input type="text" class="form-control" id="customerState" name="state" value="${dcEscape(customer.state || "")}"></div><div class="col-md-4"><label class="form-label" for="customerPincode">Pincode</label><input type="text" class="form-control" id="customerPincode" name="pincode" value="${dcEscape(customer.pincode || "")}"></div> ${!editing ? `<div class="col-12"><hr class="my-2"><h5 class="mb-1">Account Access</h5><p class="text-muted mb-3">Optionally create a customer login account.</p></div><div class="col-12"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" id="customerCreateLogin"><label class="form-check-label" for="customerCreateLogin">Create Login Account</label></div></div><div id="customerLoginFields" class="row g-3 d-none"><div class="col-md-6"><label class="form-label" for="customerLoginEmail">Login Email<span class="text-danger">*</span></label><input type="email" class="form-control" id="customerLoginEmail" name="loginEmail"><div class="invalid-feedback">Login email is required.</div></div><div class="col-md-6"><label class="form-label" for="customerLoginPassword">Password<span class="text-danger">*</span></label><input type="password" class="form-control" id="customerLoginPassword" name="password" minlength="8"><div class="invalid-feedback">Password must contain at least 8 characters.</div></div><div class="col-md-6"><label class="form-label" for="customerConfirmPassword">Confirm Password</label> <input type="password" class="form-control" id="customerConfirmPassword" name="confirmPassword"><div class="invalid-feedback">Passwords do not match.</div></div></div>` : "" } <div class="col-12"><div class="d-flex gap-2"><button type="submit" class="btn btn-primary" id="customerSaveBtn"><i class="bi bi-check-circle me-1"></i> ${editing ? "Update Customer" : "Create Customer"} </button><button type="button" class="btn btn-light" id="customerCancelBtn">Cancel</button></div></div></form></div></div>`;

  const form = document.getElementById("customerForm");
  const backButton = document.getElementById("customerBackBtn");
  const cancelButton = document.getElementById("customerCancelBtn");
  const errorBox = document.getElementById("customerFormError");
  const goBack = () => { customersPage(); };

  backButton.addEventListener("click",goBack);
  cancelButton.addEventListener("click",goBack);

  if (!editing) {
    const createLogin = document.getElementById("customerCreateLogin");
    const loginFields = document.getElementById("customerLoginFields");
    const loginEmail = document.getElementById("customerLoginEmail");
    const loginPassword = document.getElementById("customerLoginPassword");
    const confirmPassword = document.getElementById("customerConfirmPassword");
    const profileEmail = document.getElementById("customerEmail");

    createLogin.addEventListener("change", () => {
      const enabled = createLogin.checked;

      loginFields.classList.toggle("d-none", !enabled);
      loginEmail.required = enabled;
      loginPassword.required = enabled;
      confirmPassword.required = enabled;

      if (enabled && !loginEmail.value && profileEmail.value) {
        loginEmail.value = profileEmail.value;
      }
    });

    profileEmail.addEventListener("input", () => {
      if (createLogin.checked && !loginEmail.dataset.modified) {
        loginEmail.value = profileEmail.value;
      }
    });

    loginEmail.addEventListener("input", () => {
      loginEmail.dataset.modified = "true";
    });
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();

    errorBox.classList.add("d-none");
    errorBox.innerHTML = "";

    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const body = Object.fromEntries( new FormData(form).entries());
    if (!editing) {
      const createLogin = document.getElementById("customerCreateLogin").checked;

      body.createUser = createLogin;
      if (createLogin) {
        const password = document.getElementById("customerLoginPassword").value;
        const confirmPassword = document.getElementById("customerConfirmPassword").value;
        const confirmInput = document.getElementById("customerConfirmPassword");

        if (password !== confirmPassword) {
          confirmInput.setCustomValidity("Passwords do not match");
          form.classList.add("was-validated");
          confirmInput.reportValidity();
          return;
        }

        confirmInput.setCustomValidity("");
        body.email = body.email || body.loginEmail;
      } else {
        delete body.loginEmail;
        delete body.password;
        delete body.confirmPassword;
      }
    }

    Object.keys(body).forEach(key => {
      if (body[key] === "") {
        body[key] = null;
      }
    });

    const saveButton = document.getElementById("customerSaveBtn");
    saveButton.disabled = true;
    saveButton.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Saving...`;

    try {
      if (editing) {
        await api(`/customers/${id}`, {method: "PUT", body: JSON.stringify(body)});
      } else if (body.createUser) {
        delete body.confirmPassword;
        await api("/admin/customers/with-user",{method:"POST", body: JSON.stringify(body)});
      } else {
        delete body.createUser;
        await api("/customers",{method:"POST",body:JSON.stringify(body)});
      }

      await customersPage();
    } catch (error) {
      let message = error.message || "Unable to save customer";

      if (error.response?.data?.errors) {
        message = error.response.data.errors.map(item => `${item.field}: ${item.message}`).join("<br>");
      }

      errorBox.innerHTML = message;
      errorBox.classList.remove("d-none");
      window.scrollTo({top: 0, behavior: "smooth"});
    } finally {
      saveButton.disabled = false;
      saveButton.innerHTML = editing ? `<i class="bi bi-check-circle me-1"></i>Update Customer` : `<i class="bi bi-check-circle me-1"></i>Create Customer`;
    }
  });
}

async function removeCustomer(id) {
  if (!confirm("Delete this customer record ?")) return;
  await api(`/customers/${id}`, {method: "DELETE"});
  loadPage('customers');
}
*/
let customerCurrentFilters = {search: "", status: "", linked: "", sortBy: "createdAt", sortOrder: "DESC"};

async function customersPage(pageNo = 1) {
  const page = document.getElementById("page");
  if(!page) {
    return;
  }
  page.innerHTML = `<div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4"><div><h4 class="mb-1">Customers</h4><div class="text-muted">Manage customer profiles and login accounts</div></div><button type="button" class="btn btn-primary" id="newCustomerBtn"><i class="bi bi-plus-lg me-1"></i>New Customer</button></div><div class="card shadow-sm mb-4"><div class="card-body"><div class="row g-3 align-items-end"><div class="col-md-4"><label class="form-label small">Search</label><input type="search" class="form-control" id="customerSearch" placeholder="Name, mobile, email or customer code" value="${dcEscape(customerCurrentFilters.search)}"></div><div class="col-md-2"><label class="form-label small">Status</label><select class="form-select" id="customerStatusFilter"><option value="">All</option><option value="ACTIVE" ${customerCurrentFilters.status === "ACTIVE" ? "selected" : ""}>Active</option><option value="INACTIVE" ${customerCurrentFilters.status === "INACTIVE" ? "selected" : ""}>Inactive</option></select></div><div class="col-md-2"><label class="form-label small">Login</label><select class="form-select" id="customerLinkedFilter"><option value="">All</option><option value="true" ${customerCurrentFilters.linked === "true" ? "selected" : ""}>Login Linked</option><option value="false" ${customerCurrentFilters.linked === "false" ? "selected" : ""}>No Login</option></select></div><div class="col-md-2"><label class="form-label small">Sort</label><select class="form-select" id="customerSortBy"><option value="createdAt">Created</option><option value="name">Name</option><option value="customerCode">Customer Code</option><option value="status">Status</option></select></div><div class="col-auto"><button type="button" class="btn btn-primary" id="customerFilterBtn"><i class="bi bi-search me-1"></i>Search</button></div><div class="col-auto"><button type="button" class="btn btn-outline-secondary" id="customerResetBtn">Reset</button></div></div></div></div><div class="card shadow-sm"><div class="card-body p-0"><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="table-light"><tr><th>Customer</th><th>Contact</th><th>Login Account</th><th>Status</th><th>Created</th><th class="text-end">Actions</th></tr></thead><tbody id="customerTableBody"><tr><td colspan="6" class="text-center py-5"><div class="spinner-border spinner-border-sm"></div></td></tr></tbody></table></div></div></div><div id="customerPagination" class="mt-3"></div>`;
  const sortBy = document.getElementById("customerSortBy");
  if(sortBy) {
    sortBy.value = customerCurrentFilters.sortBy;
  }
  document.getElementById("newCustomerBtn")?.addEventListener("click", () => { customerForm(); });
  document.getElementById("customerFilterBtn")?.addEventListener("click", () => { applyCustomerFilters(); });
  document.getElementById("customerResetBtn")?.addEventListener("click", () => {
    customerCurrentFilters = {
      search: "",
      status: "",
      linked: "",
      sortBy: "createdAt",
      sortOrder: "DESC"
    };
    customersPage(1);
  });
  document.getElementById("customerSearch")?.addEventListener("keydown", event => {
    if(event.key === "Enter") {
      applyCustomerFilters();
    }
  });
  await loadCustomers(pageNo);
}

async function loadCustomers(pageNo = 1) {
  const params = new URLSearchParams();
  params.set("page", pageNo);
  params.set("limit", 20);
  Object.entries(customerCurrentFilters).forEach(
    ([key, value]) => {
      if(value !== undefined && value !== null && String(value).trim() !== "") {
        params.set(key, value);
      }
    });
  try {
    const response = await api(`/customers?${params.toString()}`);
    const customers = response.data || [];
    renderCustomerTable(customers);
    renderCustomerPagination(response.pagination);
  } catch(error) {
    showApiError(error, "Unable to load customers.");
  }
}

function applyCustomerFilters() {
  customerCurrentFilters = {
    search: document.getElementById("customerSearch")?.value?.trim() || "",
    status: document.getElementById("customerStatusFilter")?.value || "",
    linked: document.getElementById("customerLinkedFilter")?.value || "",
    sortBy: document.getElementById("customerSortBy")?.value || "createdAt",
    sortOrder: "DESC"
  };
  loadCustomers(1);
}

function renderCustomerTable(customers) {
  const body = document.getElementById("customerTableBody");
  if(!body) {
    return;
  }
  if(!customers.length) {
    body.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-5">No customers found.</td></tr>
    `;
    return;
  }
  body.innerHTML = customers.map(customer => customerTableRow(customer)).join("");
  bindCustomerTableEvents();
}

function customerTableRow(customer) {
  const user = customer.user;
  const statusClass = customer.status === "ACTIVE" ? "success" : "secondary";
  return `<tr><td><div class="fw-semibold">${dcEscape(customer.name)}</div><div class="small text-muted"> ${dcEscape(customer.customerCode || "-" )}</div></td><td><div><i class="bi bi-phone me-1"></i>${dcEscape(customer.mobile || "-" )}</div><div class="small text-muted">${dcEscape(customer.email || "-")}</div></td><td>${user ? `<div class="fw-semibold">${dcEscape(user.email)}</div><span class="badge text-bg-success">Linked</span>` : `<span class="badge text-bg-warning">No Login</span>`}</td><td><span class="badge text-bg-${statusClass}">${dcEscape(customer.status)}</span></td><td>${formatDateTime(customer.createdAt)}</td><td class="text-end"><div class="dropdown"><button type="button" class="btn btn-sm btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">Actions</button><ul class="dropdown-menu dropdown-menu-end"><li><button type="button" class="dropdown-item" data-customer-view="${customer.id}"><i class="bi bi-eye me-2"></i>View</button></li><li><button type="button" class="dropdown-item" data-customer-edit="${customer.id}"><i class="bi bi-pencil me-2"></i>Edit</button></li>${user ? `<li><button type="button" class="dropdown-item" data-customer-login="${customer.id}"><i class="bi bi-person-gear me-2"></i>Manage Login</button></li>` : `<li><button type="button" class="dropdown-item" data-customer-create-login="${customer.id}"><i class="bi bi-person-plus me-2"></i>Create Login</button></li>`}<li><hr class="dropdown-divider"></li><li><button type="button" class="dropdown-item text-danger" data-customer-delete="${customer.id}"><i class="bi bi-trash me-2"></i>Delete</button></li></ul></div></td></tr>`;
}

function bindCustomerTableEvents() {
  document.querySelectorAll("[data-customer-view]").forEach(button => {
    button.addEventListener("click", () => { customerDetailsPage(Number(button.dataset.customerView)); });
  });
  document.querySelectorAll("[data-customer-edit]").forEach(button => {
    button.addEventListener("click", () => { customerForm(Number(button.dataset.customerEdit)); });
  });
  document.querySelectorAll("[data-customer-create-login]").forEach(button => {
    button.addEventListener("click", () => { createCustomerLoginForm(Number(button.dataset.customerCreateLogin)); });
  });
  document.querySelectorAll("[data-customer-login]").forEach(button => {
    button.addEventListener("click", () => { manageCustomerLogin(Number(button.dataset.customerLogin)); });
  });
  document.querySelectorAll("[data-customer-delete]").forEach(button => {
    button.addEventListener("click", () => { deleteCustomer(Number(button.dataset.customerDelete)); });
  });
}

async function customerForm(id = null) {
  const page = document.getElementById("page");
  if(!page) {
    return;
  }
  let customer = {};
  try {
    if(id) {
      const response = await api(`/customers/${id}`);
      customer = response.data || response;
    }
    page.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4"><h4 class="mb-0">${id ? "Edit Customer" : "New Customer"}</h4><button type="button" class="btn btn-outline-secondary" id="customerBackBtn">Back</button></div><div class="card shadow-sm"><div class="card-body"><form id="customerFormElement" novalidate><div class="row g-3"><div class="col-md-6"><label class="form-label">Name<span class="text-danger">*</span></label><input type="text" class="form-control" id="customerName" value="${dcEscape(customer.name || "")}" required></div><div class="col-md-6"><label class="form-label">Mobile<span class="text-danger">*</span></label><input type="text" class="form-control" id="customerMobile" value="${dcEscape(customer.mobile || "")}" required></div><div class="col-md-6"><label class="form-label">Email</label><input type="email" class="form-control" id="customerEmail" value="${dcEscape( customer.email || "" )}"></div><div class="col-md-6"><label class="form-label">Status</label><select class="form-select" id="customerStatus"><option value="ACTIVE" ${(customer.status || "ACTIVE") === "ACTIVE" ? "selected" : ""}>Active</option><option value="INACTIVE" ${customer.status === "INACTIVE" ? "selected" : ""}>Inactive</option></select></div><div class="col-12"><label class="form-label">Address</label><textarea class="form-control" id="customerAddress" rows="3">${dcEscape( customer.address || "")}</textarea></div></div><div class="d-flex justify-content-end gap-2 mt-4"><button type="button" class="btn btn-outline-secondary" id="customerCancelBtn">Cancel</button><button type="submit" class="btn btn-primary" id="customerSaveBtn">Save Customer</button></div></form></div></div>`;
    const goBack = () => {
      customersPage();
    };
    document.getElementById("customerBackBtn")?.addEventListener("click", goBack);
    document.getElementById("customerCancelBtn")?.addEventListener("click", goBack);
    document.getElementById("customerFormElement")?.addEventListener("submit", async event => {
      event.preventDefault();
      const form = event.currentTarget;
      if(!form.checkValidity()) {
        form.classList.add("was-validated");
        return;
      }
      const payload = {
        name: document.getElementById("customerName")?.value?.trim(),
        mobile: document.getElementById("customerMobile")?.value?.trim(),
        email: document.getElementById("customerEmail")?.value?.trim(),
        status: document.getElementById("customerStatus")?.value,
        address: document.getElementById("customerAddress")?.value?.trim()
      };
      try {
        const response = await api(id ? `/customers/${id}` : "/customers", {
          method: id ? "PUT" : "POST",
          body: JSON.stringify(payload)
        });
        showGlobalAlert("success", response.message || "Customer saved successfully.");
        customersPage();
      } catch(error) {
        showApiError(error, "Unable to save customer.");
      }
    });
  } catch(error) {
    showApiError(error, "Unable to load customer.");
  }
}

async function deleteCustomer(customerId) {
  const confirmed = window.confirm("Are you sure you want to delete this customer?");
  if(!confirmed) {
    return;
  }
  try {
    const response = await api(`/customers/${customerId}`, {
      method: "DELETE"
    });
    showGlobalAlert("success", response.message || "Customer deleted successfully.");
    await loadCustomers(1);
  } catch(error) {
    showApiError(error, "Unable to delete customer.");
  }
}

function renderCustomerPagination(pagination) {
  const container = document.getElementById("customerPagination");
  if(!container) {
    return;
  }
  if(!pagination || pagination.totalPages <= 1) {
    container.innerHTML = "";
    return;
  }
  const currentPage = Number(pagination.page);
  const totalPages = Number(pagination.totalPages);
  const total = Number(pagination.total);
  const limit = Number(pagination.limit);
  const start = (
    (currentPage - 1) * limit) + 1;
  const end = Math.min(currentPage * limit, total);
  const pages = getCrudPaginationPages(currentPage, totalPages);
  container.innerHTML = `<div class="d-flex justify-content-between align-items-center flex-wrap gap-3"><div class="small text-muted">Showing ${start} to ${end} of ${total}</div><ul class="pagination pagination-sm mb-0"><li class="page-item ${currentPage === 1 ? "disabled" : ""}"><button type="button" class="page-link" data-customer-page="${currentPage - 1}"> Previous</button></li>${pages.map(page => { if(page === "...") { return `<li class="page-item disabled"><span class="page-link">...</span></li>`; } return `<li class="page-item ${page === currentPage ? "active" : ""}"><button type="button" class="page-link" data-customer-page="${page}">${page}</button></li>`; }).join("")}<li class="page-item ${currentPage >= totalPages ? "disabled" : ""}"><button type="button" class="page-link" data-customer-page="${currentPage + 1}">Next</button></li></ul></div>`;
  container.querySelectorAll("[data-customer-page]").forEach(button => {
    button.addEventListener("click", () => {
      const page = Number(button.dataset.customerPage);
      if(page < 1 || page > totalPages || page === currentPage) {
        return;
      }
      loadCustomers(page);
    });
  });
}

async function createCustomerLoginForm(customerId) {
  const page = document.getElementById("page");
  if(!page) {
    return;
  }
  page.innerHTML = `<div class="card shadow-sm"><div class="card-body"><h5 class="mb-4">Create Customer Login</h5><form id="customerLoginForm"><div class="mb-3"><label class="form-label">Login Email</label><input type="email" class="form-control" id="customerLoginEmail" required></div><div class="mb-3"><label class="form-label">Password</label><input type="password" class="form-control" id="customerLoginPassword" minlength="8" required></div><div class="d-flex gap-2"><button type="submit" class="btn btn-primary">Create Login</button><button type="button" class="btn btn-outline-secondary" id="customerLoginCancel">Cancel</button></div></form></div></div>`;
  document.getElementById("customerLoginCancel")?.addEventListener("click", () => { customersPage(); });
  document.getElementById("customerLoginForm")?.addEventListener("submit", async event => {
    event.preventDefault();
    const payload = {
      email: document.getElementById("customerLoginEmail")?.value?.trim(),
      password: document.getElementById("customerLoginPassword")?.value
    };
    try {
      const response = await api(`/admin/customers/${customerId}/create-user`, {method: "POST", body: JSON.stringify(payload)});
      showGlobalAlert("success", response.message || "Customer login created successfully.");
      customersPage();
    } catch(error) {
      showApiError(error, "Unable to create login.");
    }
  });
}


// ===================================================
//   Driver page related function
// ===================================================
/*
async function driversPage() {
  const [drivers, users] = await Promise.all([ api("/drivers?isDeleted=0"), api("/admin/users") ]);
  const userMap = new Map();

  users.forEach(user => {
    if (user.driverProfile) {
      userMap.set(user.driverProfile.id,user);
    }
  });

  page.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-3"><div><h2 class="mb-1">Drivers</h2><p class="text-muted mb-0">Manage drivers and driver login accounts</p></div><button class="btn btn-primary" id="addDriverBtn"><i class="bi bi-plus-lg me-1"></i>Add Driver</button></div><div class="card border-0 shadow-sm"><div class="card-body table-responsive"><table class="table table-hover align-middle"><thead><tr><th>Driver Code</th><th>Name</th><th>Mobile</th><th>License</th><th>Availability</th><th>Rating</th><th>Login Account</th><th class="text-end">Actions</th></tr></thead><tbody> ${ drivers.map(driver => { const linkedUser = userMap.get(driver.id); return `<tr><td> ${dcEscape(driver.driverCode)} </td><td> ${dcEscape(driver.name)}</td><td> ${dcEscape(driver.mobile)} </td><td> ${dcEscape(driver.licenseNo)} </td><td><span class="badge text-bg-info"> ${dcEscape(driver.availability)} </span></td><td> ${dcEscape(driver.rating)} </td><td> ${ linkedUser ? `<div><strong> ${dcEscape(linkedUser.email)} </strong></div><small class="text-muted"> ${dcEscape(linkedUser.status)}</small>` : `<span class="badge text-bg-warning">No Account</span>` } </td><td class="text-end text-nowrap"><button class="btn btn-sm btn-outline-primary driver-edit" data-id="${driver.id}"><i class="bi bi-pencil-square"></i>Edit</button> <button class="btn btn-sm btn-outline-danger driver-delete" data-id="${driver.id}"><i class="bi bi-trash"></i> Delete</button> ${ linkedUser ? `<button class="btn btn-sm btn-outline-dark driver-user-manage" data-user-id="${linkedUser.id}"><i class="bi bi-person-gear"></i>Manage Login</button>` : `<button class="btn btn-sm btn-outline-success driver-user-create" data-driver-id="${driver.id}"><i class="bi bi-person-plus"></i>Create Login</button>` } </td></tr>`; }).join("") } </tbody></table></div></div>`;

  document.getElementById("addDriverBtn").addEventListener("click", () => { driverForm(); });
  document.querySelectorAll(".driver-edit").forEach(button => {
    button.addEventListener("click", () => {
      driverForm(Number(button.dataset.id));
    });
  });

  document.querySelectorAll(".driver-delete").forEach(button => { 
    button.addEventListener("click", () => { 
      removeDriver(Number(button.dataset.id));
    });
  });  

  document.querySelectorAll(".driver-user-create").forEach(button => {
    button.addEventListener("click", () => {
      createDriverLoginForm(Number(button.dataset.driverId));
    });
  });

  document.querySelectorAll(".driver-user-manage").forEach(button => {
    button.addEventListener("click", () => {
      userForm(Number(button.dataset.userId));
    });
  });
}
*/
async function driversPage(pageNo = 1) {
  const page = document.getElementById("page");
  page.innerHTML = `<div class="d-flex justify-content-center py-5"><div class="spinner-border text-primary"></div></div>`;

  try {
    const result = await api(`/drivers?page=${pageNo}&limit=20`);
    const drivers = result.data || [];

    page.innerHTML = `<div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4"><div><h4 class="mb-1"><i class="bi bi-person-badge me-2"></i>Drivers</h4><div class="text-muted">Manage drivers, login accounts and availability.</div></div><button type="button" class="btn btn-primary" id="addDriverBtn"><i class="bi bi-plus-lg me-1"></i>Add Driver</button></div><div class="card shadow-sm mb-4"><div class="card-body"><div class="row g-2"><div class="col-md-5"><input type="search" class="form-control" id="driverSearch" placeholder="Search driver, mobile, licence..."></div><div class="col-md-3"><select class="form-select" id="driverAvailabilityFilter"><option value="">All Availability</option><option value="AVAILABLE">Available</option><option value="BUSY">Busy</option><option value="OFFLINE">Offline</option><option value="ON_LEAVE">On Leave</option></select></div><div class="col-md-2"><select class="form-select" id="driverStatusFilter"><option value="">All Status</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></div><div class="col-md-2"><button type="button" class="btn btn-outline-primary w-100" id="driverFilterBtn">Search</button></div></div></div></div><div class="card shadow-sm"><div class="card-body p-0"><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="table-light"><tr><th>Driver</th><th>Contact</th><th>Licence</th><th>Availability</th><th>Login Account</th><th>Status</th><th class="text-end">Actions</th></tr></thead><tbody>${drivers.length ? drivers.map(driver => driverTableRow(driver)).join("") : ` < tr > < td colspan = "7" class = "text-center py-5 text-muted " > No drivers found. < /td> < /tr>`}</tbody></table></div></div></div><div id="driverPagination" class="mt-3"></div>`;
    
    /*
     * ADD DRIVER
     */
    document.getElementById("addDriverBtn").addEventListener("click", () => {driverForm();});

    /*
     * FILTER
     */
    document.getElementById("driverFilterBtn").addEventListener("click", searchDrivers);
    document.getElementById("driverSearch").addEventListener("keydown", event => { if(event.key === "Enter") { searchDrivers(); }});

    /*
     * ACTION BUTTONS
     */
    page.querySelectorAll("[data-driver-edit]").forEach(button => {
      button.addEventListener("click", () => {
        driverForm(button.dataset.driverEdit);
      });
    });
    page.querySelectorAll("[data-driver-view]").forEach(button => {
      button.addEventListener("click", () => {
        driverDetailsPage(button.dataset.driverView);
      });
    });
    page.querySelectorAll("[data-driver-delete]").forEach(button => {
      button.addEventListener("click", () => {
        deleteDriver(button.dataset.driverDelete);
      });
    });
    page.querySelectorAll("[data-driver-login]").forEach(button => {
      button.addEventListener("click", () => {
        createDriverLoginForm(button.dataset.driverLogin);
      });
    });
    page.querySelectorAll("[data-driver-location]").forEach(button => {
      button.addEventListener("click", () => {
        viewDriverLocation(button.dataset.driverLocation);
      });
    });
    page.querySelectorAll("[data-driver-availability]").forEach(select => {
      select.addEventListener("change", async() => {
        await changeDriverAvailability(select.dataset.driverAvailability, select.value);
      });
    });
    renderDriverPagination(result.pagination);
  } catch(error) {
    page.innerHTML = `<div class="alert alert-danger">${dcEscape(error.message || "Unable to load drivers")}</div>`;
  }
}

function driverTableRow(driver) {
  const loginUser = driver.user || null;
  const availabilityClass = {AVAILABLE: "success", BUSY: "warning", OFFLINE: "secondary", ON_LEAVE: "info"};
  const statusClass = driver.status === "ACTIVE" ? "success" : "secondary";
  return `<tr><td><div class="fw-semibold">${dcEscape(driver.name || "-")}</div><div class="small text-muted">${dcEscape(driver.driverCode || `DRV-${driver.id}`)}</div></td><td><div>${dcEscape(driver.mobile || "-")}</div><div class="small text-muted">${dcEscape(driver.email || "-")}</div></td><td><div>${dcEscape(driver.licenseNo || "-")}</div>${driver.licenseExpiry ? `<div class="small text-muted">Exp: ${dcEscape(driver.licenseExpiry)}</div>` : ""}</td><td><select class="form-select form-select-sm" data-driver-availability="${driver.id}"><option value="AVAILABLE" ${driver.availability === "AVAILABLE" ? "selected" : ""}>Available</option><option value="BUSY" ${driver.availability === "BUSY" ? "selected" : ""}>Busy</option><option value="OFFLINE"${driver.availability === "OFFLINE" ? "selected" : ""}>Offline</option><option value="ON_LEAVE" ${driver.availability === "ON_LEAVE" ? "selected" : ""}>On Leave</option></select><span class="badge text-bg-${availabilityClass[driver.availability] || "secondary"} mt-1">${dcEscape(driver.availability || "UNKNOWN")}</span></td><td>${loginUser ? `<div class="small fw-semibold" >${dcEscape(loginUser.email)}</div><span class="badge text-bg-${loginUser.status === "ACTIVE" ? "success" : "secondary"}">${dcEscape(loginUser.status)}</span>` : `<button type="button" class="btn btn-sm btn-outline-primary" data-driver-login="${driver.id}">Create Login</button>`}</td><td><span class="badge text-bg-${statusClass}">${dcEscape(driver.status)}</span></td><td class="text-end"><div class="btn-group"><button type="button" class="btn btn-sm btn-outline-secondary" data-driver-view="${driver.id}" title="View"><i class="bi bi-eye"></i></button><button type="button" class="btn btn-sm btn-outline-primary" data-driver-edit="${driver.id}" title="Edit"><i class="bi bi-pencil"></i></button><button type="button" class="btn btn-sm btn-outline-info" data-driver-location="${driver.id}" title="Location"><i class="bi bi-geo-alt"></i></button><button type="button" class="btn btn-sm btn-outline-danger" data-driver-delete="${driver.id}" title="Delete"><i class="bi bi-trash"></i></button></div></td></tr>`;
}

async function searchDrivers() {
  const search = document.getElementById("driverSearch").value.trim();
  const availability = document.getElementById("driverAvailabilityFilter").value;
  const status = document.getElementById("driverStatusFilter").value;
  const params = new URLSearchParams();
  params.set("page", "1");
  params.set("limit", "20");
  if(search) { params.set("search", search); }
  if(availability) { params.set("availability", availability); }
  if(status) { params.set("status", status); }
  try {
    const result = await api(`/drivers?${params.toString()}`);
    const tbody = document.querySelector("#page table tbody");
    const drivers = result.data || [];
    tbody.innerHTML = drivers.length ? drivers.map(driver => driverTableRow(driver)).join("") : `<tr><td colspan="7" class="text-center py-5 text-muted">No drivers found.</td></tr>`;
    bindDriverTableEvents();
    renderDriverPagination(result.pagination);
  } catch(error) {
    showGlobalAlert("danger", error.message);
  }
}

function bindDriverTableEvents() {
  const page = document.getElementById("page");
  page.querySelectorAll("[data-driver-edit]").forEach(button => {
    button.addEventListener("click", () => {
      driverForm(button.dataset.driverEdit);
    });
  });
  page.querySelectorAll("[data-driver-view]").forEach(button => {
    button.addEventListener("click", () => {
      driverDetailsPage(button.dataset.driverView);
    });
  });
  page.querySelectorAll("[data-driver-location]").forEach(button => {
    button.addEventListener("click", () => {
      viewDriverLocation(button.dataset.driverLocation);
    });
  });
  page.querySelectorAll("[data-driver-delete]").forEach(button => {
    button.addEventListener("click", () => {
      deleteDriver(button.dataset.driverDelete);
    });
  });
  page.querySelectorAll("[data-driver-login]").forEach(button => {
    button.addEventListener("click", () => {
      createDriverLoginForm(button.dataset.driverLogin);
    });
  });
  page.querySelectorAll("[data-driver-availability]").forEach(select => {
    select.addEventListener("change", async() => {
      await changeDriverAvailability(select.dataset.driverAvailability, select.value);
    });
  });
}

/*
async function driverForm(id = null) {
  const editing = Boolean(id);
  let driver = {};

  if (editing) {
    try {
      driver = await api(`/drivers/${id}`);
    } catch (error) {
      alert(error.message);
      return;
    }
  }

  page.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-3"><div><h2 class="mb-1">${editing ? "Edit Driver" : "Add Driver"}</h2><p class="text-muted mb-0">${editing ? `Update driver #${id}` : "Create a new driver profile"}</p></div><button type="button" class="btn btn-outline-secondary" id="driverBackBtn"><i class="bi bi-arrow-left me-1"></i>Back</button></div><div id="driverFormError" class="alert alert-danger d-none"></div><div class="card border-0 shadow-sm"><div class="card-body"><form id="driverForm" class="row g-3" novalidate><div class="col-md-6"><label class="form-label" for="driverName">Name<span class="text-danger">*</span></label><input type="text" class="form-control" id="driverName" name="name" value="${dcEscape(driver.name || "")}" minlength="2" required><div class="invalid-feedback">Driver name is required.</div></div><div class="col-md-6"><label class="form-label" for="driverMobile">Mobile<span class="text-danger">*</span></label><input type="text" class="form-control" id="driverMobile" name="mobile" value="${dcEscape(driver.mobile || "")}" minlength="8" maxlength="20" required><div class="invalid-feedback">A valid mobile number is required.</div></div><div class="col-md-6"><label class="form-label" for="driverEmail">Email</label><input type="email" class="form-control" id="driverEmail" name="email" value="${dcEscape(driver.email || "")}"><div class="invalid-feedback">Enter a valid email address.</div></div><div class="col-md-6"><label class="form-label" for="driverLicenseNo">License Number<span class="text-danger">*</span></label><input type="text" class="form-control" id="driverLicenseNo" name="licenseNo" value="${dcEscape(driver.licenseNo || "")}" required><div class="invalid-feedback">License number is required.</div></div><div class="col-md-4"><label class="form-label" for="driverLicenseExpiry">License Expiry</label><input type="date" class="form-control" id="driverLicenseExpiry" name="licenseExpiry" value="${dcEscape(driver.licenseExpiry || "")}"></div><div class="col-md-4"><label class="form-label" for="driverExperience">Experience Years</label><input type="number" class="form-control" id="driverExperience" name="experienceYears" min="0" step="0.1" value="${dcEscape(driver.experienceYears || 0)}"></div><div class="col-md-4"><label class="form-label" for="driverRating">Rating</label><input type="number" class="form-control" id="driverRating" value="${dcEscape(driver.rating || 0)}" readonly></div><div class="col-12"><label class="form-label" for="driverAddress">Address</label><textarea class="form-control" id="driverAddress" name="address" rows="3">${dcEscape(driver.address || "")}</textarea></div><div class="col-md-6"><label class="form-label" for="driverAvailability">Availability</label><select class="form-select" id="driverAvailability" name="availability">${["AVAILABLE", "BUSY", "OFFLINE"].map(status => `<option value="${status}" ${(driver.availability || "OFFLINE") === status ? "selected" : ""} >${status}</option>`).join("")}</select></div><div class="col-md-6"><label class="form-label" for="driverStatus">Driver Status</label><select class="form-select" id="driverStatus" name="status">${["ACTIVE", "INACTIVE", "SUSPENDED"].map(status => `<option value="${status}" ${(driver.status || "ACTIVE") === status ? "selected" : ""} >${status}</option>`).join("")}</select></div> ${!editing ? `<div class="col-12"><hr class="my-2"><h5 class="mb-1">Account Access</h5><p class="text-muted mb-3">Optionally create a login account for this driver.</p></div><div class="col-12"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" id="driverCreateLogin"><label class="form-check-label" for="driverCreateLogin">Create Driver Login</label></div></div><div id="driverLoginFields" class="row g-3 d-none"><div class="col-md-6"><label class="form-label" for="driverLoginEmail">Login Email<span class="text-danger">*</span></label><input type="email" class="form-control" id="driverLoginEmail" name="loginEmail"><div class="invalid-feedback">Login email is required.</div></div><div class="col-md-6"><label class="form-label" for="driverLoginPassword">Password<span class="text-danger">*</span></label><input type="password" class="form-control" id="driverLoginPassword" name="password" minlength="8"><div class="invalid-feedback">Password must contain at least 8 characters.</div></div><div class="col-md-6"><label class="form-label" for="driverConfirmPassword">Confirm Password</label><input type="password" class="form-control" id="driverConfirmPassword" name="confirmPassword"><div class="invalid-feedback">Passwords do not match.</div></div></div>` : ""}<div class="col-12"><div class="d-flex gap-2"><button type="submit" class="btn btn-primary" id="driverSaveBtn"><i class="bi bi-check-circle me-1"></i>${editing ? "Update Driver" : "Create Driver"}</button><button type="button" class="btn btn-light" id="driverCancelBtn">Cancel</button></div></div></form></div></div>`;

  const form = document.getElementById("driverForm");
  const backButton = document.getElementById("driverBackBtn");
  const cancelButton = document.getElementById("driverCancelBtn");
  const errorBox = document.getElementById("driverFormError");

  const goBack = () => { driversPage(); };

  backButton.addEventListener("click",goBack);
  cancelButton.addEventListener("click",goBack);

  if (!editing) {
    const createLogin = document.getElementById("driverCreateLogin");
    const loginFields = document.getElementById("driverLoginFields");
    const loginEmail = document.getElementById("driverLoginEmail");
    const loginPassword = document.getElementById("driverLoginPassword");
    const confirmPassword = document.getElementById("driverConfirmPassword");
    const profileEmail = document.getElementById("driverEmail");

    createLogin.addEventListener("change",() => {
      const enabled = createLogin.checked;

      loginFields.classList.toggle("d-none",!enabled);
      loginEmail.required = enabled;
      loginPassword.required = enabled;

      confirmPassword.required = enabled;
      if (enabled && !loginEmail.value && profileEmail.value) {
        loginEmail.value = profileEmail.value;
      }
    });

    profileEmail.addEventListener("input", () => {
      if (createLogin.checked && !loginEmail.dataset.modified) {
          loginEmail.value = profileEmail.value;
      }
    });

    loginEmail.addEventListener("input",() => {
      loginEmail.dataset.modified = "true";
    });
  }

  form.addEventListener("submit",async event => {
    event.preventDefault();

    errorBox.classList.add("d-none");
    errorBox.innerHTML = "";
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const body = Object.fromEntries(new FormData(form).entries());
    if (!editing) {
      const createLogin = document.getElementById("driverCreateLogin").checked;
      body.createUser = createLogin;

      if (createLogin) {
        const password = document.getElementById("driverLoginPassword").value;
        const confirmPassword = document.getElementById("driverConfirmPassword").value;
        const confirmInput = document.getElementById("driverConfirmPassword");

        if (password !== confirmPassword) {
          confirmInput.setCustomValidity("Passwords do not match");
          form.classList.add("was-validated");
          confirmInput.reportValidity();
          return;
        }

        confirmInput.setCustomValidity("");
        body.email = body.email || body.loginEmail;
      } else {
        delete body.loginEmail;
        delete body.password;
        delete body.confirmPassword;
      }
    }

    Object.keys(body).forEach(key => {
      if (body[key] === "") {
        body[key] = null;
      }
    });

    const saveButton = document.getElementById("driverSaveBtn");
    saveButton.disabled = true;
    saveButton.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Saving...`;
    try {
      if (editing) {
        await api(`/drivers/${id}`,{method: "PUT", body: JSON.stringify(body)});
      } else if (body.createUser) {
        delete body.confirmPassword;
        await api("/admin/drivers/with-user",{method: "POST", body: JSON.stringify(body)});
      } else {
        delete body.createUser;
        await api("/drivers",{method:"POST",body:JSON.stringify(body)});
      }

      await driversPage();
    } catch (error) {
      let message = error.message || "Unable to save driver";
      if (error.response?.data?.errors) {
          message = error.response.data.errors.map(item => `${item.field}: ${item.message}`).join("<br>");
      }

      errorBox.innerHTML = message;
      errorBox.classList.remove("d-none");
      window.scrollTo({top: 0, behavior:"smooth"});
    } finally {
      saveButton.disabled = false;
      saveButton.innerHTML = editing ? `<i class="bi bi-check-circle me-1"></i>Update Driver` : `<i class="bi bi-check-circle me-1"></i>Create Driver`;
    }
  });
}
*/

async function driverForm(id = null) {
  const page = document.getElementById("page");
  let driver = null;
  if(id) {
    try {
      driver = await api(`/drivers/${id}`);
    } catch(error) {
      showGlobalAlert("danger", error.message);
      return;
    }
  }
  page.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4"><div><h4 class="mb-1">${id ? "Edit Driver" : "Add Driver"}</h4><div class="text-muted">${id ? "Update driver profile information." : "Create a new driver profile."}</div></div><button type="button" class="btn btn-outline-secondary" id="backDriversBtn"><i class="bi bi-arrow-left me-1"></i>Back</button></div><form id="driverForm" class="card shadow-sm"><div class="card-body"><div class="row g-3"><div class="col-md-6"><label class="form-label">Driver Name<span class="text-danger">*</span></label><input type="text" class="form-control" id="driverName" value="${dcEscape(driver?.name || "")}" required></div><div class="col-md-6"><label class="form-label">Mobile Number<span class="text-danger">*</span></label><input type="text" class="form-control" id="driverMobile" value="${dcEscape(driver?.mobile || "")}" required></div><div class="col-md-6"><label class="form-label">Email</label><input type="email" class="form-control" id="driverEmail" value="${dcEscape(driver?.email || "")}"></div><div class="col-md-6"><label class="form-label">License Number</label><input type="text" class="form-control" id="driverLicense" value="${dcEscape(driver?.licenseNo || "")}"></div><div class="col-md-4"><label class="form-label"> License Expiry</label><input type="date" class="form-control" id="driverLicenseExpiry" value="${dcEscape(driver?.licenseExpiry || "")}"></div><div class="col-md-4"><label class="form-label">Experience (Years)</label><input type="number" min="0" class="form-control" id="driverExperience" value="${driver?.experienceYears || 0}"></div><div class="col-md-4"><label class="form-label">Availability</label><select class="form-select" id="driverAvailability"><option value="AVAILABLE" ${(driver ?.availability || "AVAILABLE") === "AVAILABLE" ? "selected" : ""}>Available</option><option value="BUSY" ${driver ?.availability === "BUSY" ? "selected" : ""}>Busy</option><option value="OFFLINE" ${driver ?.availability === "OFFLINE" ? "selected" : ""}>Offline</option><option value="ON_LEAVE" ${driver ?.availability === "ON_LEAVE" ? "selected" : ""}>On Leave</option></select></div><div class="col-md-12"><label class="form-label">Address</label><textarea class="form-control" id="driverAddress" rows="2">${dcEscape(driver?.address || "")}</textarea></div><div class="col-md-4"><label class="form-label">City</label><input type="text" class="form-control" id="driverCity" value="${dcEscape(driver?.city || "")}"></div><div class="col-md-4"><label class="form-label">State</label><input type="text" class="form-control" id="driverState" value="${dcEscape(driver?.state || "")}"></div><div class="col-md-4"><label class="form-label">Pincode</label><input type="text" class="form-control" id="driverPincode" value="${dcEscape(driver?.pincode || "")}"></div><div class="col-md-6"><label class="form-label">Status</label><select class="form-select" id="driverStatus"><option value="ACTIVE" ${(driver?.status || "ACTIVE") === "ACTIVE" ? "selected" : ""}>Active</option><option value="INACTIVE" ${driver?.status === "INACTIVE" ? "selected" : ""}>Inactive</option></select></div>${!id ? `<div class="col-12 mt-4"><div class="border rounded p-3 bg-light"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="createDriverLogin"><label class="form-check-label fw-semibold" for="createDriverLogin">Create login account for this driver</label></div><div id="driverLoginFields" class="row g-3 mt-1 d-none"><div class="col-md-6"><label class="form-label">Login Email</label><input type="email" class="form-control" id="driverLoginEmail"></div><div class="col-md-6"><label class="form-label">Password</label><input type="password" class="form-control" id="driverLoginPassword"></div></div></div></div>` : ""}</div></div><div class="card-footer bg-white text-end"><button type="submit" class="btn btn-primary" id="saveDriverBtn"><i class="bi bi-check-lg me-1"></i>${id ? "Update Driver" : "Create Driver"}</button></div></form>`;

  document.getElementById("backDriversBtn").addEventListener("click", () => {driversPage();});
  if(!id) {
    const createLogin = document.getElementById("createDriverLogin");
    const loginFields = document.getElementById("driverLoginFields");
    const loginEmail = document.getElementById("driverLoginEmail");
    createLogin.addEventListener("change", () => {
      loginFields.classList.toggle("d-none", !createLogin.checked);
      if(createLogin.checked && !loginEmail.value) {
        loginEmail.value = document.getElementById("driverEmail").value;
      }
    });
  }
  document.getElementById("driverForm").addEventListener("submit", async event => {
    event.preventDefault();
    const payload = {
      name: document.getElementById("driverName").value.trim(),
      mobile: document.getElementById("driverMobile").value.trim(),
      email: document.getElementById("driverEmail").value.trim(),
      licenseNo: document.getElementById("driverLicense").value.trim(),
      licenseExpiry: document.getElementById("driverLicenseExpiry").value || null,
      experienceYears: Number(document.getElementById("driverExperience").value || 0),
      availability: document.getElementById("driverAvailability").value,
      address: document.getElementById("driverAddress").value.trim(),
      city: document.getElementById("driverCity").value.trim(),
      state: document.getElementById("driverState").value.trim(),
      pincode: document.getElementById("driverPincode").value.trim(),
      status: document.getElementById("driverStatus").value
    };
    try {
      if(id) {
        await api(`/drivers/${id}`, {method: "PUT", body: JSON.stringify(payload)});
      } else {
        const createLogin = document.getElementById("createDriverLogin").checked;
        if(createLogin) {
          payload.createUser = true;
          payload.loginEmail = document.getElementById("driverLoginEmail").value.trim();
          payload.password = document.getElementById("driverLoginPassword").value;
          await api("/admin/drivers/with-user", {method: "POST", body: JSON.stringify(payload)});
        } else {
          await api("/drivers", {method: "POST", body: JSON.stringify(payload)});
        }
      }
      showGlobalAlert("success", id ? "Driver updated successfully." : "Driver created successfully.");
      await driversPage();

    } catch(error) {
      showGlobalAlert("danger", error.message);
    }
  });
}

async function changeDriverAvailability(driverId, availability) {
  try {
    await api(`/drivers/${driverId}/availability`, {method: "PUT", body: JSON.stringify({availability})});
    showGlobalAlert("success", "Driver availability updated.");
  } catch(error) {
    showGlobalAlert("danger", error.message);
    await driversPage();
  }
}

/*
async function removeDriver(id) {
  if(!confirm("Delete this driver record ?")) return;
  await api(`/drivers/${id}`,{method: "DELETE"});
  await loadPage('drivers');
}
*/

async function deleteDriver(driverId) {
  const confirmed = window.confirm("Are you sure you want to delete this driver?");
  if(!confirmed) {
    return;
  }
  try {
    await api(`/drivers/${driverId}`, {method: "DELETE"});
    showGlobalAlert("success", "Driver deleted successfully.");
    await driversPage();
  } catch(error) {
    showGlobalAlert("danger", error.message);
  }
}

async function viewDriverLocation(driverId) {
  try {
    const result = await api(`/drivers/${driverId}/location`);
    const driver = result.driver;
    const location = result.location;
    const page = document.getElementById("page");

    page.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4"><div><h4>Driver Location</h4><div class="text-muted">${dcEscape(driver.name)} · ${dcEscape(driver.driverCode)}</div></div><button type="button" class="btn btn-outline-secondary" id="backLocationBtn">Back</button></div><div class="card shadow-sm"><div class="card-body">${location ? ` < div class="row g-3"><div class="col-md-4"><small class="text-muted">Latitude</small><div class="fw-semibold">${dcEscape(String(location.latitude))}</div></div><div class="col-md-4"><small class="text-muted">Longitude</small><div class="fw-semibold">${dcEscape(String(location.longitude))}</div></div><div class="col-md-4"><small class="text-muted">Last Updated</small><div class="fw-semibold">${location.updatedAt ? new Date(location.updatedAt).toLocaleString() : "-"}</div></div></div>` : `<div class="text-center text-muted py-5">No location information is available for this driver.</div>`}</div></div>`;

    document.getElementById("backLocationBtn").addEventListener("click", () => {driversPage();});
  } catch(error) {
    showGlobalAlert("danger", error.message);
  }
}

async function driverDetailsPage(driverId) {
  try {
    const driver = await api(`/drivers/${driverId}`);
    const page = document.getElementById("page");

    page.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4"><div><h4>${dcEscape(driver.name)}</h4><div class="text-muted">${dcEscape(driver.driverCode || "")}</div></div><div><button type="button" class="btn btn-primary me-2" id="editDriverDetailsBtn">Edit</button><button type="button" class="btn btn-outline-secondary" id="backDriverDetailsBtn">Back</button></div></div><div class="row g-4"><div class="col-lg-8"><div class="card shadow-sm"><div class="card-body"><div class="row g-4"><div class="col-md-6"><small class="text-muted">Mobile</small><div>${dcEscape(driver.mobile || "-")}</div></div><div class="col-md-6"><small class="text-muted">Email</small><div>${dcEscape(driver.email || "-")}</div></div><div class="col-md-6"><small class="text-muted">Licence</small><div>${dcEscape(driver.licenseNo || "-")}</div></div><div class="col-md-6"><small class="text-muted">Licence Expiry</small><div>${dcEscape(driver.licenseExpiry || "-")}</div></div><div class="col-md-6"><small class="text-muted">Availability</small><div>${dcEscape(driver.availability || "-")}</div></div><div class="col-md-6"><small class="text-muted">Status</small><div>${dcEscape(driver.status || "-")}</div></div><div class="col-12"><small class="text-muted">Address</small><div>${dcEscape([driver.address, driver.city, driver.state, driver.pincode].filter(Boolean).join(", ") || "-")}</div></div></div></div></div></div><div class="col-lg-4"><div class="card shadow-sm"><div class="card-header bg-white"><strong>Login Account</strong></div><div class="card-body">${driver.user ? `<div class="fw-semibold mb-1">${dcEscape(driver.user.email)}</div><span class="badge text-bg-success">${dcEscape(driver.user.status)}</span>` : `<div class="text-muted mb-3">No login account linked.</div><button type="button" class="btn btn-outline-primary btn-sm" id="detailsCreateLoginBtn">Create Login</button>`}</div></div></div></div>`;

    document.getElementById("backDriverDetailsBtn").addEventListener("click", () => { driversPage(); });
    document.getElementById("editDriverDetailsBtn").addEventListener("click", () => { driverForm(driverId); });

    const createLoginBtn = document.getElementById("detailsCreateLoginBtn");
    if(createLoginBtn) {
      createLoginBtn.addEventListener("click", () => { createDriverLoginForm(driverId); });
    }
  } catch(error) {
    showGlobalAlert("danger", error.message);
  }
}

function renderDriverPagination(pagination) {
  const container = document.getElementById("driverPagination");
  if(!container) {
    return;
  }
  /*
   * Expected pagination object:
   *
   * {
   *     page: 1,
   *     limit: 20,
   *     total: 125,
   *     totalPages: 7
   * }
   */
  if(!pagination || !pagination.totalPages || pagination.totalPages <= 1) {
    container.innerHTML = "";
    return;
  }
  const currentPage = Number(pagination.page || 1);
  const totalPages = Number(pagination.totalPages || 1);
  const total = Number(pagination.total || 0);
  const limit = Number(pagination.limit || 20);
  /*
   * Calculate record range
   */
  const startRecord = total === 0 ? 0 : (
    (currentPage - 1) * limit) + 1;
  const endRecord = Math.min(currentPage * limit, total);
  /*
   * Generate page numbers.
   *
   * Example:
   *
   * 1 2 3 4 5
   *
   * or
   *
   * 1 ... 5 6 7 ... 20
   */
  const pages = getDriverPaginationPages(currentPage, totalPages);
  let pageButtons = "";
  pages.forEach(page => {
    /*
     * Ellipsis
     */
    if(page === "...") {
      pageButtons += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      return;
    }
    /*
     * Normal page
     */
    pageButtons += `<li class="page-item ${page === currentPage ? "active" : ""}"><button type="button" class="page-link" data-driver-page="${page}">${page}</button></li>`;
  });
  /*
   * Render pagination
   */
  container.innerHTML = `<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3"><div class="small text-muted">Showing <strong>${startRecord}</strong> to <strong>${endRecord}</strong> of <strong>${total}</strong> drivers</div><nav aria-label="Driver pagination"><ul class="pagination pagination-sm mb-0"><!-- Previous --><li class="page-item ${currentPage <= 1 ? "disabled" : ""}"><button type="button" class="page-link" data-driver-page="${currentPage - 1}" ${currentPage <= 1 ? "disabled" : ""}><i class="bi bi-chevron-left"></i><span class="d-none d-sm-inline ms-1">Previous</span></button></li>${pageButtons}<!-- Next --><li class="page-item ${currentPage >= totalPages ? "disabled" : ""}"><button type="button" class="page-link" data-driver-page="${currentPage + 1}" ${currentPage >= totalPages ? "disabled" : ""}><span class="d-none d-sm-inline me-1">Next</span><i class="bi bi-chevron-right"></i></button></li></ul></nav></div>`;
  /*
   * CSP-safe event listeners.
   *
   * Do NOT use onclick=""
   */
  container.querySelectorAll("[data-driver-page]").forEach(button => {
    button.addEventListener("click", () => {
      if(button.disabled) {
        return;
      }
      const page = Number(button.dataset.driverPage);
      if(!Number.isInteger(page) || page < 1 || page > totalPages || page === currentPage) {
        return;
      }
      driversPage(page);
    });
  });
}


/*
function customerAccountFields() {
  return `<div class="col-12"><hr><h5>Account Access</h5><p class="text-muted"> Optionally create a customer login account.</p></div><div class="col-12"><div class="form-check"><input class="form-check-input" type="checkbox" id="customerCreateLogin" name="createUser"><label class="form-check-label" for="customerCreateLogin">Create Login Account</label></div></div><div id="customerLoginFields" class="row g-3 d-none"><div class="col-md-6"><label class="form-label">Login Email</label><input type="email" class="form-control" name="loginEmail"></div><div class="col-md-6"><label class="form-label">Password</label><input type="password" class="form-control" name="password" minlength="8"></div></div>`;
}

//const checkbox = document.getElementById("customerCreateLogin");
//const loginFields = document.getElementById("customerLoginFields");
//checkbox.addEventListener("change", () => {
//  loginFields.classList.toggle("d-none", !checkbox.checked);
//}); 

const form = document.getElementById("customerForm");
form.addEventListener("submit", async event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target).entries());
  const createUser = document.getElementById("customerCreateLogin").checked;

  data.createUser = createUser;
  if (createUser) {
    data.email = data.loginEmail || data.email;
    await api("/admin/customers/with-user",{method:"POST", body:JSON.stringify(data)});
  } else {
    delete data.password;
    delete data.loginEmail;

    await api("/customers",{method:"POST", body:JSON.stringify(data)});
  }

  customersPage();
});

function driverAccountFields() {
  return `<div class="col-12"><hr><h5>Account Access</h5><p class="text-muted">Optionally create a driver login account.</p></div><div class="col-12"><div class="form-check"><input class="form-check-input" type="checkbox" id="driverCreateLogin" name="createUser"><label class="form-check-label" for="driverCreateLogin">Create Driver Login</label></div></div><div id="driverLoginFields" class="row g-3 d-none"><div class="col-md-6"><label class="form-label">Login Email</label><input type="email" class="form-control" name="loginEmail"></div><div class="col-md-6"><label class="form-label">Password</label><input type="password" class="form-control" name="password" minlength="8"></div></div>`;
}

const driverCheckbox = document.getElementById("driverCreateLogin");
const driverLoginFields = document.getElementById("driverLoginFields");

driverCheckbox.addEventListener("change",() => {
  driverLoginFields.classList.toggle("d-none",!driverCheckbox.checked);
});

document.getElementById("driverForm").addEventListener("submit",async event => {
  event.preventDefault();

  const data = Object.fromEntries(new FormData(event.target).entries());
  const createUser = document.getElementById("driverCreateLogin").checked;

  data.createUser = createUser;
  if (createUser) {
    data.email = data.loginEmail || data.email;
    await api("/admin/drivers/with-user",{method:"POST",body:JSON.stringify(data)});
  } else {
    delete data.password;
    delete data.loginEmail;

    await api("/drivers",{method:"POST",body:JSON.stringify(data)});
  }
  driversPage();
});

async function createCustomerLoginForm(customerId) {
  const customer = await api(`/customers/${customerId}`);

  page.innerHTML = `<div class="d-flex justify-content-between mb-3"><div><h2>Create Customer Login</h2><p class="text-muted"> ${dcEscape(customer.name)} </p></div><button class="btn btn-outline-secondary" id="customerLoginBack">Back</button></div><div class="card border-0 shadow-sm"><div class="card-body"><form id="customerLoginForm" class="row g-3"><div class="col-md-6"><label class="form-label">Login Email</label><input type="email" class="form-control" name="email" value="${dcEscape(customer.email)}" required></div><div class="col-md-6"><label class="form-label">Password</label><input type="password" class="form-control" name="password" minlength="8" required></div><div class="col-12"><button class="btn  btn-primary">Create Login</button></div></form></div></div>`;

  document.getElementById("customerLoginBack").addEventListener("click",customersPage);
  document.getElementById("customerLoginForm").addEventListener("submit",async event => {
    event.preventDefault();

    const data = Object.fromEntries(new FormData(event.target).entries());
    await api(`/admin/customers/${customerId}/create-user`,{method: "POST", body: JSON.stringify(data)});
    customersPage();
  });
}

async function createDriverLoginForm(driverId) {
  const driver = await api(`/drivers/${driverId}`);

  page.innerHTML = `<div class="d-flex justify-content-between mb-3"><div><h2>Create Driver Login</h2><p class="text-muted">${dcEscape(driver.name)}</p></div><button class="btn btn-outline-secondary" id="driverLoginBack">Back</button></div><div class="card border-0 shadow-sm"><div class="card-body"><form id="driverLoginForm" class="row g-3"><div class="col-md-6"><label class="form-label">Login Email</label><input type="email" class="form-control" name="email" value="${dcEscape(driver.email)}" required></div><div class="col-md-6"><label class="form-label">Password</label><input type="password" class="form-control" name="password" minlength="8" required></div><div class="col-12"><button class="btn btn-primary">Create Login</button></div></form></div></div>`;

  document.getElementById("driverLoginBack").addEventListener("click",driversPage);
  document.getElementById("driverLoginForm").addEventListener("submit",async event => {
    event.preventDefault();

    const data = Object.fromEntries(new FormData(event.target).entries());
    await api(`/admin/drivers/${driverId}/create-user`,{method: "POST", body: JSON.stringify(data)});

    driversPage();
  });
}  

async function crudPage(title, endpoint, fields) {
  const rows = await api(endpoint);

  page.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div><h2 class="mb-1">${title}</h2><p class="text-muted mb-0">Super Admin record management</p></div>
      <button id="dcAddBtn" class="btn btn-primary"><i class="bi bi-plus-lg me-1"></i>Add ${title.charAt(0).toUpperCase() + title.slice(1, -1).toLowerCase()}</button>
    </div>
    <div class="card border-0 shadow-sm"><div class="card-body table-responsive">
      <table class="table table-hover align-middle">
        <thead><tr>${fields.map(f=>`<th>${dcLabelize(f)}</th>`).join("")}<th class="text-end">Actions</th></tr></thead>
        <tbody>
          ${rows.length ? rows.map(r=>`
            <tr>
              ${fields.map(f=>`<td>${dcEscape(r[f])}</td>`).join("")}
              <td class="text-end text-nowrap">
                <button class="btn btn-sm btn-outline-primary me-1 dc-edit" data-id="${r.id}"><i class="bi bi-pencil-square"></i> Edit</button>
                <button class="btn btn-sm btn-outline-danger dc-delete" data-id="${r.id}"><i class="bi bi-trash"></i> Delete</button>
              </td>
            </tr>`).join("") : `<tr><td colspan="${fields.length+1}" class="text-center text-muted py-4">No records found</td></tr>`}
        </tbody>
      </table>
    </div></div>`;

  document.getElementById("dcAddBtn").addEventListener("click",()=>dcRecordForm(endpoint,title));
  document.querySelectorAll(".dc-edit").forEach(b=>b.addEventListener("click",()=>dcRecordForm(endpoint,title,Number(b.dataset.id))));
  document.querySelectorAll(".dc-delete").forEach(b=>b.addEventListener("click",()=>removeRow(endpoint,Number(b.dataset.id),title)));
}
*/

async function dcRecordForm(endpoint,title,id=null) {
  const editing = !!id;
  let record = {};
  if (editing) record = await api(`${endpoint}/${id}`);

  page.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div><h2 class="mb-1">${editing?"Edit":"Add"} ${title.slice(0,-1)}</h2>
      <p class="text-muted mb-0">${editing?`Updating record #${id}`:"Create new record"}</p></div>
      <button id="dcBackBtn" class="btn btn-outline-secondary">Back</button>
    </div>
    <div class="card border-0 shadow-sm"><div class="card-body">
      <form id="dcRecordForm" class="row g-3">
        ${dcFields(title).map(f=>dcRenderField(f,record[f.name])).join("")}
        <div class="col-12"><button class="btn btn-primary">${editing?"Update":"Create"} Record</button></div>
      </form>
    </div></div>`;

  document.getElementById("dcBackBtn").addEventListener("click",()=>loadPage(title.toLowerCase()));
  document.getElementById("dcRecordForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    Object.keys(body).forEach(k=>{ if(body[k]==="") body[k]=null; });
    await api(editing?`${endpoint}/${id}`:endpoint,{
      method: editing?"PUT":"POST",
      body: JSON.stringify(body)
    });
    await loadPage(title.toLowerCase());
  });
}

async function showCreate(endpoint, title) {
  // const fields = title === "Customers" ? ["name","mobile","email","address","city","state","pincode"] : title === "Drivers" ? ["name","mobile","email","address","licenseNo","licenseExpiry","experienceYears"] : ["vehicleNo","vehicleType","brand","model","year","insuranceExpiry","fitnessExpiry"];

  // console.log(title);
  let fields = [];
  if(title === "Customers"){
    fields = ["name","mobile","email","address","city","state","pincode"];
  } else if(title === "Drivers") {
    fields = ["name","mobile","email","address","licenseNo","licenseExpiry","experienceYears"];
  } else if(title === "Vehicles") {
    fields = ["vehicleNo","vehicleType","brand","model","year","insuranceExpiry","fitnessExpiry"];
  } else if(title === "Payments") {
    fields = ["bookingId","amount","paymentMode","paymentStatus","paymentDate"];
  }
  //console.log(fields);

  if(title === "Payments"){

    // Find the index of the element
    const index = fields.indexOf('bookingId');

    // Ensure the element exists before trying to remove it
    if (index > -1) {
      fields.splice(index, 1); // 2nd parameter (1) means remove exactly one item
    }

    const bookings = await api("/bookings?status=STARTED");
    
    page.innerHTML = `<div class="d-flex justify-content-between mb-3"><h2>Add ${title}</h2>
    <button class="btn btn-secondary" onclick="loadPage('${title.toLowerCase()}')">Back</button></div>
    <div class="card border-0 shadow-sm"><div class="card-body"><form id="createForm" class="row g-3"><div class="col-md-6"><label>Booking</label><select class="form-select" name="bookingId">${bookings.map(b => `<option value="${b.id}">${b.bookingNo}</option>`).join("")}</select></div>
    ${fields.map(f => `<div class="col-md-6"><label class="form-label">${f}</label><input class="form-control" name="${f}" ${f.includes("Date")||f.toLowerCase().includes("expiry")?'type="date"':''}></div>`).join("")}
    <div class="col-12"><button class="btn btn-primary">Save</button></div></form></div></div>`;
  } else {
    page.innerHTML = `<div class="d-flex justify-content-between mb-3"><h2>Add ${title}</h2>
    <button class="btn btn-secondary" onclick="loadPage('${title.toLowerCase()}')">Back</button></div>
    <div class="card border-0 shadow-sm"><div class="card-body"><form id="createForm" class="row g-3">
    ${fields.map(f => `<div class="col-md-6"><label class="form-label">${f}</label><input class="form-control" name="${f}" ${f.includes("Date")||f.toLowerCase().includes("expiry")?'type="date"':''}></div>`).join("")}
    <div class="col-12"><button class="btn btn-primary">Save</button></div></form></div></div>`;
  }

  document.getElementById("createForm").addEventListener("submit", async e => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    try {
      await api(endpoint, { method: "POST", body: JSON.stringify(body) });
      await loadPage(title.toLowerCase());
    } catch(err) { alert(err.message); }
  });
}

async function removeRow(endpoint, id, title) {
  if (!confirm("Delete this record?")) return;
  await api(`${endpoint}/${id}`, { method: "DELETE" });
  loadPage(title.toLowerCase());
}


/*
|--------------------------------------------------------------------------
| GENERIC CRUD PAGE
|--------------------------------------------------------------------------
*/
async function crudPage(name, pageNo = 1) {
  const config = crudConfigs[name];
  if(!config) {
    showGlobalAlert("danger", `CRUD configuration not found for ${name}.`);
    return;
  }
  const page = document.getElementById("page");
  if(!page) {
    return;
  }
  const state = getCrudState(name);
  state.page = pageNo;
  page.innerHTML = `<div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4"><div><h4 class="mb-1">${dcEscape(config.title)}</h4><div class="text-muted">Manage ${dcEscape(config.title.toLowerCase())}</div></div><button type="button" class="btn btn-primary" id="crudAddBtn"><i class="bi bi-plus-lg me-1"></i>Add ${dcEscape(config.singularTitle || "")}</button></div>${renderCrudFilterBar(name, config)}<div class="card shadow-sm"><div class="card-body p-0"><div class="table-responsive"><table class="table table-hover align-middle mb-0"><thead class="table-light">${renderCrudTableHeader(config)}</thead><tbody id="crudTableBody"><tr><td colspan="${config.columns.length + 1}" class="text-center py-5"><div class="spinner-border spinner-border-sm"></div><span class="ms-2 text-muted">Loading...</span></td></tr></tbody></table></div></div></div><div id="crudPagination" class="mt-3"></div>`;

  bindCrudFilterEvents(name, config);
  document.getElementById("crudAddBtn")?.addEventListener("click", () => { crudForm(name); });
  await loadCrudData(name);
}

/*
|--------------------------------------------------------------------------
| CRUD STATE
|--------------------------------------------------------------------------
*/
function getCrudState(name) {
  if (!crudState[name]) {
      crudState[name] = {page: 1, limit: 20, search: "", filters: {}, sortBy: "createdAt", sortOrder: "DESC"};
  }
  return crudState[name];
}

/*
|--------------------------------------------------------------------------
| CRUD FILTER BAR
|--------------------------------------------------------------------------
*/
function renderCrudFilterBar(name, config) {
  const state = getCrudState(name);
  const filterHtml = (config.filters || []).map(filter => {
    if(filter.type !== "select") {
      return "";
    }

    return `<div class="col-md-3 col-lg-2"><label class="form-label small">${dcEscape(filter.label)}</label><select class="form-select crud-filter" data-filter-name="${dcEscape(filter.name)}">${(filter.options || []).map(option => `<option value="${dcEscape(option.value)}" ${String(state.filters[filter.name] || "") === String(option.value) ? "selected" : ""}>${dcEscape(option.label)}</option>`).join("")}</select></div>`;
  }).join("");

  const sortHtml = (config.sortOptions || []).map(item => `<option value="${dcEscape(item.value)}" ${state.sortBy === item.value ? "selected" : ""}>${dcEscape(item.label)}</option>`).join("");

  return `<div class="card shadow-sm mb-4"><div class="card-body"><div class="row g-3 align-items-end"><div class="col-md-4 col-lg-3"><label class="form-label small">Search</label><input type="search" class="form-control" id="crudSearch" value="${dcEscape( state.search )}" placeholder="${dcEscape( config.searchPlaceholder || "Search...")}"></div>${filterHtml} ${sortHtml ? `<div class="col-md-3 col-lg-2"><label class="form-label small">Sort By</label><select class="form-select" id="crudSortBy">${sortHtml}</select></div><div class="col-md-2 col-lg-2"><label class="form-label small">Order</label><select class="form-select" id="crudSortOrder"><option value="DESC" ${state.sortOrder === "DESC" ? "selected" : ""}>Descending</option><option value="ASC" ${state.sortOrder === "ASC" ? "selected" : ""}>Ascending</option></select></div>` : ""}<div class="col-auto"><button type="button" class="btn btn-primary" id="crudSearchBtn"><i class="bi bi-search me-1"></i>Search</button></div><div class="col-auto"><button type="button" class="btn btn-outline-secondary" id="crudResetBtn"><i class="bi bi-arrow-counterclockwise me-1"></i>Reset</button></div></div></div></div>`;
}

/*
|--------------------------------------------------------------------------
| CRUD FILTER EVENTS
|--------------------------------------------------------------------------
*/
function bindCrudFilterEvents(name, config) {  
  const executeSearch = () => {
    const state = getCrudState(name);
    state.search = document.getElementById("crudSearch")?.value?.trim() || "";
    state.filters = {};
    document.querySelectorAll(".crud-filter").forEach(element => {
      const key = element.dataset.filterName;
      if(key) {
        state.filters[key] = element.value;
      }
    });
    const sortBy = document.getElementById("crudSortBy");
    if(sortBy) {
      state.sortBy = sortBy.value;
    }
    const sortOrder = document.getElementById("crudSortOrder");
    if(sortOrder) {
      state.sortOrder = sortOrder.value;
    }
    state.page = 1;
    loadCrudData(name);
  };
  document.getElementById("crudSearchBtn")?.addEventListener("click", executeSearch);
  document.getElementById("crudSearch")?.addEventListener("keydown", event => {
    if(event.key === "Enter") {
      executeSearch();
    }
  });
  document.getElementById("crudResetBtn")?.addEventListener("click", () => {
    crudState[name] = {
      page: 1,
      limit: 20,
      search: "",
      filters: {},
      sortBy: "createdAt",
      sortOrder: "DESC"
    };
    crudPage(name, 1);
  });
}

/*
|--------------------------------------------------------------------------
| LOAD CRUD DATA
|--------------------------------------------------------------------------
*/
async function loadCrudData(name) {
  const config = crudConfigs[name];
  if(!config) {
    return;
  }
  const state = getCrudState(name);
  const params = new URLSearchParams(); //console.log(params);

  if(config.deleteFilter && config.deleteFilter.length > 0){
    config.deleteFilter.forEach(filter => {
      params.set(filter.name, filter.value);
    });
  }

  params.set("page", state.page);
  params.set("limit", state.limit);
  if(state.search) { params.set("search", state.search); }
  if(state.sortBy) { params.set("sortBy", state.sortBy); }
  if(state.sortOrder) { params.set("sortOrder", state.sortOrder); }
  Object.entries(state.filters || {}).forEach(
    ([key, value]) => {
      if(value !== undefined && value !== null && String(value).trim() !== "") {
        params.set(key, value);
      }
    }
  );
  const body = document.getElementById("crudTableBody");
  try {
    const result = await api(`${config.endpoint}?${params.toString()}`);
    const items = Array.isArray(result) ? result : result.data || [];
    renderCrudTable(name, items);
    renderCrudPagination(name, result.pagination);
  } catch(error) {
    if(body) {
      body.innerHTML = `<tr><td colspan="${config.columns.length + 1}" class="text-center text-danger py-4">Unable to load data.</td></tr>`;
    }
    showApiError(error, `Unable to load ${config.title}.`);
  }
}

/*
|--------------------------------------------------------------------------
| TABLE HEADER
|--------------------------------------------------------------------------
*/
function renderCrudTableHeader(config) {
  //console.log(config.columns);
  return `<tr>${config.columns.map(column => `<th>${dcEscape(column.label)}</th>`).join("")}<th class="text-end" style="width: 150px;">Actions</th></tr>`;
}

/*
|--------------------------------------------------------------------------
| RENDER CRUD TABLE
|--------------------------------------------------------------------------
*/
function renderCrudTable(name, items) {
  const config = crudConfigs[name];
  const body = document.getElementById("crudTableBody");
  if(!config || !body) {
    return;
  }
  if(!items.length) {
    body.innerHTML = `<tr><td colspan="${config.columns.length + 1}" class="text-center text-muted py-5">No records found.</td></tr>`;
    return;
  }
  body.innerHTML = items.map(item => renderCrudRow(name, config, item)).join("");
  bindCrudRowEvents(name);
}

/*
|--------------------------------------------------------------------------
| CRUD TABLE ROW
|--------------------------------------------------------------------------
*/
function renderCrudRow(name, config, item) {
  return `<tr>${config.columns.map(column => `<td>${formatCrudValue(item[column.field], column)}</td>`).join("")}<td class="text-end"><div class="btn-group btn-group-sm"><button type="button" class="btn btn-outline-primary" data-crud-edit="${item.id}"><i class="bi bi-pencil"></i></button><button type="button" class="btn btn-outline-danger ms-2" data-crud-delete="${item.id}"><i class="bi bi-trash"></i></button></div></td></tr>`;
}

/*
|--------------------------------------------------------------------------
| FORMAT TABLE VALUE
|--------------------------------------------------------------------------
*/
function formatCrudValue(value, column) {
  if(value === undefined || value === null || value === "") {
    return "-";
  }
  switch(column.type) {
    case "datetime":
      return formatDateTime(value);
    case "money":
      return formatMoney(value);
    case "status":
      return renderStatusBadge(value);
    case "boolean":
      return value ? `<span class="badge text-bg-success">Yes</span>` : `<span class="badge text-bg-secondary">No</span>`;
    default:
      return dcEscape(value);
  }
}

/*
|--------------------------------------------------------------------------
| STATUS BADGE
|--------------------------------------------------------------------------
*/
function renderStatusBadge(status) {
  const normalized = String(status).toUpperCase();
  const classes = {ACTIVE: "success", AVAILABLE: "success", COMPLETED: "success", CONFIRMED: "primary", ASSIGNED: "info", ACCEPTED: "info", STARTED: "warning", PENDING: "secondary", BUSY: "warning", INACTIVE: "secondary", OFFLINE: "secondary", CANCELLED: "danger", FAILED: "danger"};

  return `<span class="badge text-bg-${classes[normalized] || "secondary"}">${dcEscape(normalized)}</span>`;
}

/*
|--------------------------------------------------------------------------
| CRUD ROW EVENTS
|--------------------------------------------------------------------------
*/
function bindCrudRowEvents(name) {
  document.querySelectorAll("[data-crud-edit]").forEach(button => {
    button.addEventListener("click", () => {
      crudForm(name, Number(button.dataset.crudEdit));
    });
  });
  document.querySelectorAll("[data-crud-delete]").forEach(button => {
    button.addEventListener("click", () => {
      deleteCrudRecord(name, Number(button.dataset.crudDelete));
    });
  });
}

/*
|--------------------------------------------------------------------------
| GENERIC CRUD FORM
|--------------------------------------------------------------------------
*/
async function crudForm(name, id = null) {
  const config = crudConfigs[name];
  const page = document.getElementById("page");
  if(!config || !page) {
    return;
  }
  let record = {};
  let formFields = config.fields || [];

  try {
    if(id) {
      const response = await api(`${config.endpoint}/${id}`);
      record = response.data || response;
    }

    for (let field of formFields) {
      if(field.type === "ajaxselect" && field.callingurl) {
        try {
          const optionResult = await api(field.callingurl);
          field.ajaxdata = optionResult.data || [];
        } catch (error) {
          console.error(`Error loading options for field ${field.name}:`, error);
        }
      }
    }
    //console.log("Form Fields after processing ajaxselect:", formFields);
    
    page.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4"><h4 class="mb-0">${id ? "Edit" : "Add"}${dcEscape(config.singularTitle)}</h4><button type="button" class="btn btn-outline-secondary" id="crudFormBackBtn"><i class="bi bi-arrow-left me-1"></i>Back</button></div><div class="card shadow-sm"><div class="card-body"><form id="crudFormElement" novalidate><div class="row g-3">${formFields.map(field => renderCrudFormField(field, record)).join("")}</div><div class="d-flex justify-content-end gap-2 mt-4"><button type="button" class="btn btn-outline-secondary" id="crudCancelBtn">Cancel</button><button type="submit" class="btn btn-primary" id="crudSaveBtn"><i class="bi bi-check-lg me-1"></i>Save</button></div></form></div></div>`;

    document.getElementById("crudFormBackBtn")?.addEventListener("click", () => { crudPage(name, getCrudState(name).page); });
    document.getElementById("crudCancelBtn")?.addEventListener("click", () => { crudPage(name, getCrudState(name).page); });
    document.getElementById("crudFormElement")?.addEventListener("submit", event => { event.preventDefault(); saveCrudRecord(name, id); });
  } catch(error) {
    showApiError(error, "Unable to load record.");
  }
}

/*
|--------------------------------------------------------------------------
| CRUD FORM FIELD
|--------------------------------------------------------------------------
*/
function renderCrudFormField(field, record) {
  const value = record[field.name] ?? field.defaultValue ?? "";
  const required = field.required ? "required" : "";

  //console.log("Rendering field:", field, "with value:", value);
  if(field.type === "textarea") {
    return `<div class="col-12"><label class="form-label">${dcEscape(field.label)} ${field.required ? '<span class="text-danger">*</span>' : ""}</label><textarea class="form-control" name="${dcEscape(field.name)}" rows="3" ${required}>${dcEscape(value)}</textarea></div>`;
  }
  if(field.type === "select") {
    return `<div class="col-md-6"><label class="form-label">${dcEscape(field.label)} ${field.required ? '<span class="text-danger">*</span>' : ""}</label><select class="form-select" name="${dcEscape(field.name)}" ${required}>${(field.options || []).map(option => `<option value="${dcEscape(option.value)}" ${String(value) === String(option.value) ? "selected" : ""}> ${dcEscape(option.label)}</option>`).join("")}</select></div>`;
  }
  if(field.type === "ajaxselect") {
    //console.log(`Ajax data for ${field.name}:`, field.ajaxdata);
    try {
      let fcontent = "";
      if(field.displayFieldFormat && typeof field.displayFieldFormat === "string") {
        const template = field.displayFieldFormat;
        let temdataRows = field.ajaxdata || [];

        temdataRows.map((row, index) => {
          const formattedString = template.replace(/\{(\w+)\}/g, (match, key) => {
            const value = row[key];
            return (value && !isNaN(value) && String(value).includes('.')) ? parseFloat(value) : value;
          });
          row.formattedString = formattedString;
          temdataRows[index] = row;
        });
        //console.log(`Formatted ajax data for ${field.name}:`, temdataRows);

        fcontent = `<div class="col-md-6"><label class="form-label">${dcEscape(field.label)} ${field.required ? '<span class="text-danger">*</span>' : ""}</label><select class="form-select" name="${dcEscape(field.name)}" ${required}>${temdataRows.map(row => `<option value="${dcEscape(row[field.valueField])}" ${String(value) === String(row[field.valueField]) ? "selected" : ""}>${dcEscape(row.formattedString)}</option>`).join("")}</select></div>`;
      } else {
        if(!Array.isArray(field.displayField)) {
          field.displayField = ["name"];
        }
        fcontent = `<div class="col-md-6"><label class="form-label">${dcEscape(field.label)} ${field.required ? '<span class="text-danger">*</span>' : ""}</label><select class="form-select" name="${dcEscape(field.name)}" ${required}>${(field.ajaxdata || []).map(row => `<option value="${dcEscape(row[field.valueField])}" ${String(value) === String(row[field.valueField]) ? "selected" : ""}>${dcEscape(field.displayField.map(key => row[key]).join(" - "))}</option>`).join("")}</select></div>`;
      }
      //console.log("Rendering ajaxselect field:", field, "with value:", value, "and content:", fcontent);
      return fcontent;
    } catch (error) {
      console.error("Error loading select options:", error);
    }
  }
  return `<div class="col-md-6"><label class="form-label">${dcEscape(field.label)} ${field.required ? '<span class="text-danger">*</span>' : ""}</label><input type="${dcEscape(field.type || "text")}" class="form-control" name="${dcEscape(field.name)}" value="${dcEscape(value)}" ${required}></div>`;
}

/*
|--------------------------------------------------------------------------
| COLLECT CRUD FORM
|--------------------------------------------------------------------------
*/
function collectCrudFormData(name) {
  const config = crudConfigs[name];
  const form = document.getElementById("crudFormElement");
  const data = {};
  if(!config || !form) { return data; }
  config.fields.forEach(field => {
    const element = form.elements[field.name];
    if(!element) { return; }
    let value = element.value;
    if(field.type === "number") {
      value = value === "" ? null : Number(value);
    }
    data[field.name] = value;
  });
  return data;
}

/*
|--------------------------------------------------------------------------
| SAVE CRUD RECORD
|--------------------------------------------------------------------------
*/
async function saveCrudRecord(name, id = null) {
  const config = crudConfigs[name];
  if(!config) {
    return;
  }
  const form = document.getElementById("crudFormElement");
  if(!form || !form.checkValidity()) {
    form?.classList.add("was-validated");
    return;
  }
  const payload = collectCrudFormData(name);
  const saveButton = document.getElementById("crudSaveBtn");
  try {
    if(saveButton) {
      saveButton.disabled = true;
      saveButton.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Saving...`;
    }
    const response = await api(id ? `${config.endpoint}/${id}` : config.endpoint, {method: id ? "PUT" : "POST", body: JSON.stringify(payload)});
    showGlobalAlert("success", response.message || `${config.singularTitle} saved successfully.`);
    crudPage(name, id ? getCrudState(name).page : 1);
  } catch(error) {
    showApiError(error, `Unable to save ${config.singularTitle}.`);
  } finally {
    if(saveButton) {
      saveButton.disabled = false;
      saveButton.innerHTML = `<i class="bi bi-check-lg me-1"></i>Save`;
    }
  }
}

/*
|--------------------------------------------------------------------------
| DELETE CRUD RECORD
|--------------------------------------------------------------------------
*/
async function deleteCrudRecord(name, id) {
  const config = crudConfigs[name];
  if(!config) {
    return;
  }
  const confirmed = window.confirm(`Are you sure you want to delete this ${config.singularTitle.toLowerCase()}?`);
  if(!confirmed) {
    return;
  }
  try {
    const response = await api(`${config.endpoint}/${id}`, {method: "DELETE"});
    showGlobalAlert("success", response.message || "Deleted successfully.");
    await loadCrudData(name);
  } catch(error) {
    showApiError(error, `Unable to delete ${config.singularTitle}.`);
  }
}

/*
|--------------------------------------------------------------------------
| VALIDATION / API ERROR HANDLING
|--------------------------------------------------------------------------
*/
function showApiError(error, fallbackMessage = "Request failed.") {
  if(Array.isArray(error.errors) && error.errors.length) {
    const message = error.errors.map(item => {
      if(item.field) {
        return `${item.field}: ${item.message}`;
      }
      return item.message;
    }).filter(Boolean).join(" | ");
    showGlobalAlert("danger", message || error.message || fallbackMessage, {
      autoClose: false
    });
    return;
  }
  showGlobalAlert("danger", error.message || fallbackMessage);
}

/*
|--------------------------------------------------------------------------
| GENERIC CRUD PAGINATION
|--------------------------------------------------------------------------
*/
function renderCrudPagination(name, pagination) {
  const container = document.getElementById("crudPagination");
  if(!container) {
    return;
  }
  if(!pagination || !pagination.totalPages) {
    container.innerHTML = "";
    return;
  }
  const currentPage = Number(pagination.page || 1);
  const totalPages = Number(pagination.totalPages || 1);
  const total = Number(pagination.total || 0);
  const limit = Number(pagination.limit || 20);
  const start = total === 0 ? 0 : ((currentPage - 1) * limit) + 1;
  const end = Math.min(currentPage * limit, total);
  const pages = getCrudPaginationPages(currentPage, totalPages);
  const pageButtons = pages.map(page => {
    if(page === "...") {
      return `<li class="page-item disabled"><span class="page-link">...</span></li>`;
    }
    return `<li class="page-item ${page === currentPage ? "active" : ""}"><button type="button" class="page-link" data-crud-page="${page}">${page}</button></li>`;
  }).join("");
  
  container.innerHTML = `<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3"><div class="small text-muted">Showing <strong>${start}</strong> to <strong>${end}</strong> of <strong>${total}</strong></div>${totalPages > 1 ? `<nav><ul class="pagination pagination-sm mb-0"><li class="page-item${currentPage <= 1 ? "disabled" : ""}"><button type="button" class="page-link" data-crud-page="${currentPage - 1}" ${currentPage <= 1 ? "disabled" : ""}>Previous</button></li>${pageButtons}<li class="page-item${currentPage >= totalPages ? "disabled" : ""}"><button type="button" class="page-link " data-crud-page="${currentPage + 1}" ${currentPage >= totalPages ? "disabled" : ""}>Next</button></li></ul></nav>` : ""}</div>`;

  container.querySelectorAll("[data-crud-page]").forEach(button => {
    button.addEventListener("click", () => {
      if(button.disabled) { return; }
      const page = Number(button.dataset.crudPage);
      if(!Number.isInteger(page) || page < 1 || page > totalPages || page === currentPage) {
        return;
      }
      const state = getCrudState(name);
      state.page = page;
      loadCrudData(name);
    });
  });
}

function getCrudPaginationPages(currentPage, totalPages) {
  if(totalPages <= 7) {
    return Array.from({length: totalPages}, (_, index) => index + 1);
  }
  if(currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }
  if(currentPage >= totalPages - 3) {
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}


// ===================================================
//   Booking page related function
// ===================================================
/*
async function bookings() {
  const rows = await api("/bookings");
  page.innerHTML = `
    <div class="d-flex justify-content-between mb-3"><h2>Bookings</h2>
      <button class="btn btn-primary" onclick="newBooking()">New Booking</button></div>
    <div class="card border-0 shadow-sm"><div class="card-body table-responsive">
    <table class="table table-hover"><thead><tr><th>No</th><th>Customer</th><th>Driver</th><th>Pickup</th><th>Drop</th><th>Date</th><th>Trip</th><th>Fare</th><th>Status</th><th>Action</th></tr></thead>
    <tbody>${rows.map(r=>`<tr>
      <td>${r.bookingNo}</td><td>${r.Customer?.name||""}</td><td>${r.Driver?.name||"Unassigned"}</td>
      <td> ${r.tripCategory === "OUTSTATION" ? `<span class="badge text-bg-warning"><i class="bi bi-signpost-split me-1"></i>Outstation</span>` : `<span class="badge text-bg-secondary">Local</span>`} </td>
      <td>${r.pickupLocation}</td><td>${r.dropLocation}</td><td>${r.pickupDate}</td><td>₹${r.fare}</td>
      <td><span class="badge text-bg-secondary">${r.status}</span></td>
      <td><button class="btn btn-sm btn-outline-primary me-1 booking-edit-btn" data-id="${r.id}"><i class="bi bi-pencil-square"></i>Edit</button><button class="btn btn-sm btn-outline-primary" onclick="assign(${r.id})">Assign</button></td></tr>`).join("")}</tbody></table></div></div>`;

  document.querySelectorAll(".booking-edit-btn").forEach(button => {
    button.addEventListener("click", () => {
      editBooking(Number(button.dataset.id));
    });
  });
}
*/

async function bookingsPage(pageNo = 1) {
  const page = document.getElementById("page");
  page.innerHTML = `<div class="d-flex justify-content-center py-5"><div class="spinner-border text-primary"></div></div>`;
  try {
    const result = await api(`/bookings?page=${pageNo}&limit=20`);
    const bookings = result.data || [];
    page.innerHTML = `<div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4"><div><h4 class="mb-1"><i class="bi bi-calendar-check me-2"></i>Bookings</h4><div class="text-muted">Manage local and outstation bookings, assignments and trip status.</div></div><button type="button" class="btn btn-primary" id="addBookingBtn"><i class="bi bi-plus-lg me-1"></i>New Booking</button></div><div id="bookingAlert" class="mb-3"></div><div class="card shadow-sm mb-4"><div class="card-body"><div class="row g-2"><div class="col-lg-3"><input type="search" class="form-control" id="bookingSearch" placeholder="Booking no., pickup, drop..."></div><div class="col-lg-2"><select class="form-select" id="bookingStatusFilter"><option value="">All Statuses</option><option value="PENDING">Pending</option><option value="CONFIRMED">Confirmed</option><option value="ASSIGNED">Assigned</option><option value="ACCEPTED">Accepted</option><option value="STARTED">Started</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></div><div class="col-lg-2"><select class="form-select" id="bookingTripFilter"><option value="">All Trips</option><option value="LOCAL">Local</option><option value="OUTSTATION">Outstation</option></select></div><div class="col-lg-2"><input type="date" class="form-control" id="bookingFromDate"></div><div class="col-lg-2"><input type="date" class="form-control" id="bookingToDate"></div><div class="col-lg-1"><button type="button" class="btn  btn-outline-primary w-100" id="bookingFilterBtn"><i class="bi bi-search"></i></button></div></div></div></div><div class="card shadow-sm"><div class="card-body p-0"><div class="table-responsive"><table class="table table-hover align-middle mb-0" id="bookingTable"><thead class="table-light"><tr><th>Booking</th><th>Customer</th><th>Trip</th><th>Schedule</th><th>Driver</th><th class="text-end">Fare</th><th>Status</th><th class="text-end">Actions</th></tr></thead><tbody>${bookings.length ? bookings.map(booking => bookingTableRow(booking)).join("") : bookingEmptyRow()}</tbody></table></div></div></div><div id="bookingPagination" class="mt-3"></div>`;
    
    document.getElementById("addBookingBtn").addEventListener("click", () => { bookingForm(); });
    document.getElementById("bookingFilterBtn").addEventListener("click", searchBookings);
    document.getElementById("bookingSearch").addEventListener("keydown", event => {
      if(event.key === "Enter") {
        searchBookings();
      }
    });
    bindBookingTableEvents();
    renderBookingPagination(result.pagination);
  } catch(error) {
    page.innerHTML = `<div class="alert alert-danger">${dcEscape(error.message || "Unable to load bookings")}</div>`;
  }
}

function bookingTableRow(booking) {
  const statusClass = {PENDING: "secondary", CONFIRMED: "primary", ASSIGNED: "info", ACCEPTED: "info", STARTED: "warning", COMPLETED: "success", CANCELLED: "danger"};
  const tripClass = booking.tripCategory === "OUTSTATION" ? "warning" : "secondary";
  return `<tr><td><div class="fw-semibold">${dcEscape(booking.bookingNo || `#${booking.id}`)}</div><div class="small text-muted">${booking.bookingType === "ROUND_TRIP" ? "Round Trip" : booking.bookingType === "HOURLY" ? "Hourly" : "One Way"}</div></td><td><div class="fw-semibold">${dcEscape(booking.customer?.name || "-")}</div><div class="small text-muted">${dcEscape(booking.customer?.mobile || "-")}</div></td><td><span class="badge text-bg-${tripClass}">${dcEscape(booking.tripCategory)}</span><div class="small mt-2 text-muted"><div><i class="bi bi-geo-alt me-1"></i>${dcEscape(booking.pickupLocation)}</div><div><i class="bi bi-geo me-1"></i>${dcEscape(booking.dropLocation)}</div></div></td><td><div>${dcEscape(booking.pickupDate || "-")}</div><div class="small text-muted">${dcEscape(booking.pickupTime || "-")}</div>${booking.returnDate ? `<div class="small text-muted mt-1">Return:${dcEscape(booking.returnDate)}</div>` : ""}</td><td>${booking.driver ? `<div class="fw-semibold">${dcEscape(booking.driver.name)}</div><div class="small text-muted">${dcEscape(booking.driver.mobile || "")}</div>` : `<span class="badge text-bg-light border text-dark">Not Assigned</span>` }</td><td class="text-end"><div class="fw-semibold">${formatMoney(booking.fare)}</div><div class="small text-muted">Commission:${formatMoney(booking.driverCommissionAmount)}</div></td><td><span class="badge text-bg-${statusClass[booking.status] || "secondary"}">${dcEscape(booking.status)}</span></td><td class="text-end"><div class="dropdown"><button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown">Actions</button><ul class="dropdown-menu dropdown-menu-end"><li><button type="button" class="dropdown-item" data-booking-view="${booking.id}"><i class="bi bi-eye me-2"></i>View</button></li>${!["COMPLETED","CANCELLED" ].includes(booking.status) ? `<li> <button type="button" class="dropdown-item" data-booking-edit="${booking.id}"><i class="bi bi-pencil me-2"></i>Edit</button></li><li><button type="button" class="dropdown-item" data-booking-assign="${booking.id}"><i class="bi bi-person-check me-2"></i>Assign Driver</button></li><li><button type="button" class="dropdown-item" data-booking-status="${booking.id}"><i class="bi bi-arrow-repeat me-2"></i>Change Status</button></li><li><button type="button" class="dropdown-item" data-booking-commission="${booking.id}"><i class="bi bi-percent me-2"></i>Commission</button></li><li><hr class="dropdown-divider"></li><li><button type="button" class="dropdown-item text-danger" data-booking-cancel="${booking.id}"><i class="bi bi-x-circle me-2"></i>Cancel Booking</button></li>` : ""} ${booking.status === "PENDING" ? `<li><button type="button" class="dropdown-item text-danger" data-booking-delete="${booking.id}"><i class="bi bi-trash me-2"></i>Delete</button></li>` : ""}</ul></div></td></tr>`;
}

function bookingEmptyRow() {
  return `<tr><td colspan="8" class="text-center py-5 text-muted">No bookings found.</td></tr>`;
}

function bindBookingTableEvents() {
  const page = document.getElementById("page");
  page.querySelectorAll("[data-booking-view]").forEach(button => {
    button.addEventListener("click", () => {
      bookingDetailsPage(button.dataset.bookingView);
    });
  });
  page.querySelectorAll("[data-booking-edit]").forEach(button => {
    button.addEventListener("click", () => {
      bookingForm(button.dataset.bookingEdit);
    });
  });
  page.querySelectorAll("[data-booking-assign]").forEach(button => {
    button.addEventListener("click", () => {
      assignBookingDriverForm(button.dataset.bookingAssign);
    });
  });
  page.querySelectorAll("[data-booking-status]").forEach(button => {
    button.addEventListener("click", () => {
      bookingStatusForm(button.dataset.bookingStatus);
    });
  });
  page.querySelectorAll("[data-booking-commission]").forEach(button => {
    button.addEventListener("click", () => {
      bookingCommissionForm(button.dataset.bookingCommission);
    });
  });
  page.querySelectorAll("[data-booking-cancel]").forEach(button => {
    button.addEventListener("click", () => {
      cancelBookingForm(button.dataset.bookingCancel);
    });
  });
  page.querySelectorAll("[data-booking-delete]").forEach(button => {
    button.addEventListener("click", () => {
      deleteBooking(button.dataset.bookingDelete);
    });
  });
}

async function searchBookings() {
  const params = new URLSearchParams();
  params.set("page", "1");
  params.set("limit", "20");
  const search = document.getElementById("bookingSearch").value.trim();
  const status = document.getElementById("bookingStatusFilter").value;
  const tripCategory = document.getElementById("bookingTripFilter").value;
  const fromDate = document.getElementById("bookingFromDate").value;
  const toDate = document.getElementById("bookingToDate").value;
  if(search) {
    params.set("search", search);
  }
  if(status) {
    params.set("status", status);
  }
  if(tripCategory) {
    params.set("tripCategory", tripCategory);
  }
  if(fromDate) {
    params.set("fromDate", fromDate);
  }
  if(toDate) {
    params.set("toDate", toDate);
  }
  try {
    const result = await api(`/bookings?${params.toString()}`);
    const tbody = document.querySelector("#bookingTable tbody");
    const bookings = result.data || [];
    tbody.innerHTML = bookings.length ? bookings.map(booking => bookingTableRow(booking)).join("") : bookingEmptyRow();
    bindBookingTableEvents();
    renderBookingPagination(result.pagination);
  } catch(error) {
    showGlobalAlert("danger", error.message);
  }
}

/*
async function newBooking() {
  const customers = await api("/customers?status=ACTIVE");
  const vehicles = await api("/vehicles?status=ACTIVE");

  page.innerHTML = `<div class="d-flex justify-content-between mb-3"><h2 class="mb-3">New Booking sssss</h2><button class="btn btn-secondary" onclick="loadPage('bookings')">Back</button></div><div class="card border-0 shadow-sm"><div class="card-body">
    <form id="bookingForm" class="row g-3">
      <div class="col-md-6"><label>Customer</label><select class="form-select" name="customerId">${customers.map(c=>`<option value="${c.id}">${c.name} - ${c.mobile}</option>`).join("")}</select></div>
      <div class="col-md-6"><label>Vehicle</label><select class="form-select" name="vehicleId"><option value="">Select None</option>${vehicles.map(v=>`<option value="${v.id}">${v.model} [ ${v.vehicleNo} ] - ${v.brand} (${v.year})</option>`).join("")}</select></div>      
      <div class="col-md-6"><label>Vehicle Type</label><input class="form-control" name="vehicleType"></div>
      <div class="col-md-6"><label>Booking Type</label><select class="form-select" name="bookingType"> ${["ONE_WAY","ROUND_TRIP","HOURLY"].map(x=>`<option value="${x}">${x}</option>`).join("")} </select></div>
      <div class="col-md-6"><label>Pickup</label><input class="form-control" name="pickupLocation" required></div>
      <div class="col-md-6"><label>Drop</label><input class="form-control" name="dropLocation" required></div>
      <div class="col-md-4"><label>Date</label><input type="date" class="form-control" name="pickupDate" required></div>
      <div class="col-md-4"><label>Time</label><input type="time" class="form-control" name="pickupTime" required></div>
      <div class="col-md-4"><label>Fare</label><input type="number" step="0.01" class="form-control" name="fare"></div>
      <div class="col-12"><label>Remarks</label><textarea class="form-control" name="remarks"></textarea></div>
      <div class="col-md-6"><label class="form-label" for="tripCategory">Trip Category<span class="text-danger">*</span></label><select class="form-select" id="tripCategory" name="tripCategory" required><option value="LOCAL" selected>Local Booking</option><option value="OUTSTATION">Outstation Booking</option></select></div>
      <div class="col-12"><button class="btn btn-primary">Create Booking</button></div>
    </form></div></div>`;

  document.getElementById("bookingForm").addEventListener("submit", async e => {
    e.preventDefault();
    try {
      await api("/bookings", { method:"POST", body:JSON.stringify(Object.fromEntries(new FormData(e.target).entries())) });
      bookings();
    } catch(err) { alert(err.message); }
  });
}

async function editBooking(id) {
  const b = await api(`/bookings/${id}`);
  page.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <div><h2 class="mb-1">Edit Booking</h2><p class="text-muted mb-0">${dcEscape(b.bookingNo)}</p></div>
      <button id="dcBookingBack" class="btn btn-outline-secondary">Back</button>
    </div>
    <div class="card border-0 shadow-sm"><div class="card-body">
      <form id="dcBookingForm" class="row g-3">
        <div class="col-md-6"><label class="form-label">Pickup Location</label><input class="form-control" name="pickupLocation" value="${dcEscape(b.pickupLocation)}" required></div>
        <div class="col-md-6"><label class="form-label">Drop Location</label><input class="form-control" name="dropLocation" value="${dcEscape(b.dropLocation)}" required></div>
        <div class="col-md-4"><label class="form-label">Pickup Date</label><input type="date" class="form-control" name="pickupDate" value="${dcEscape(b.pickupDate)}" required></div>
        <div class="col-md-4"><label class="form-label">Pickup Time</label><input type="time" class="form-control" name="pickupTime" value="${dcEscape(String(b.pickupTime||"").slice(0,5))}" required></div>
        <div class="col-md-4"><label class="form-label">Fare</label><input type="number" step="0.01" class="form-control" name="fare" value="${dcEscape(b.fare)}"></div>
        <div class="col-md-6"><label class="form-label">Vehicle Type</label><input class="form-control" name="vehicleType" value="${dcEscape(b.vehicleType)}"></div>
        <div class="col-md-6"><label class="form-label">Booking Type</label>
          <select class="form-select" name="bookingType">
            ${["ONE_WAY","ROUND_TRIP","HOURLY"].map(x=>`<option value="${x}" ${b.bookingType===x?"selected":""}>${x}</option>`).join("")}
          </select></div>
        <div class="col-12"><label class="form-label">Remarks</label><textarea class="form-control" name="remarks" rows="3">${dcEscape(b.remarks)}</textarea></div>
        <div class="col-md-6"><label class="form-label" for="tripCategory">Trip Category<span class="text-danger">*</span></label><select class="form-select" id="tripCategory" name="tripCategory" required><option value="LOCAL" ${(b.tripCategory || "LOCAL") === "LOCAL" ? "selected" : ""} >Local Booking</option><option value="OUTSTATION" ${b.tripCategory === "OUTSTATION" ? "selected" : ""} >Outstation Booking</option></select></div>
        <div class="col-12"><button class="btn btn-primary">Update Booking</button></div>
      </form>
    </div></div>`;

  document.getElementById("dcBookingBack").addEventListener("click",bookings);
  document.getElementById("dcBookingForm").addEventListener("submit",async e=>{
    e.preventDefault();
    await api(`/bookings/${id}`,{method:"PUT",body:JSON.stringify(Object.fromEntries(new FormData(e.target).entries()))});
    await bookings();
  });
}
*/

async function bookingForm(id = null) {
  const page = document.getElementById("page");
  try {
    //const requests = [api("/customers?limit=100")];
    const requests = [api("/customers?status=ACTIVE"), api("/vehicles?status=ACTIVE")];
    if(id) {
      requests.push(api("/vehicle-types?status=ACTIVE"));
      requests.push(api(`/bookings/${id}`));
    }
    const results = await Promise.all(requests);  //console.log("Booking form results:", results);
    const customerResult = results[0];
    const customers = customerResult.data || customerResult || [];

    const vehicleResult = results[1];
    const vehicles = vehicleResult.data || vehicleResult || [];

    const booking = id ? results[3] : null;

    if(id && booking) {
      const vehicleTypeResult = results[2]; //console.log("Vehicle type result:", vehicleTypeResult);
      const vehicleTypes = vehicleTypeResult.data || vehicleTypeResult || [];   //console.log("Vehicle types:", vehicleTypes);
      //console.log("Booking form data:", { id, customers, vehicles, booking, vehicleTypes });

      page.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4"><div><h4 class="mb-1">${id ? "Edit Booking" : "New Booking"}</h4><div class="text-muted">${id ? "Update trip and fare information." : "Create a local or outstation booking."}</div></div><button type="button" class="btn btn-outline-secondary" id="backBookingsBtn"><i class=" bi bi-arrow-left me-1"></i>Back</button></div><form id="bookingForm" class="card shadow-sm"><div class="card-body"><div class="row g-3"><div class="col-md-6"><label class="form-label" >Customer</label><select class="form-select" id="bookingCustomer" required ><option value="">Select Customer</option>${customers.map(customer => `<option value="${customer.id}" ${Number(booking?.customerId) === Number(customer.id) ? "selected" : ""}>${dcEscape(customer.name)} - ${dcEscape(customer.mobile || "")}</option>`).join("")}</select></div><div class="col-md-3"><label class="form-label">Trip Category</label><select class="form-select" id="bookingTripCategory"><option value="LOCAL" ${(booking?.tripCategory || "LOCAL") === "LOCAL" ? "selected" : ""}>Local</option><option value="OUTSTATION" ${booking?.tripCategory === "OUTSTATION" ? "selected" : ""}>Outstation</option></select></div><div class="col-md-3"><label class="form-label">Booking Type</label><select class="form-select" id="bookingType"><option value="ONE_WAY" ${(booking?.bookingType || "ONE_WAY") === "ONE_WAY" ? "selected" : ""}>One Way</option><option value="ROUND_TRIP" ${booking?.bookingType === "ROUND_TRIP" ? "selected" : ""}>Round Trip</option><option value="HOURLY" ${booking?.bookingType === "HOURLY" ? "selected" : ""}>Hourly</option></select></div><div class="col-md-6"><label class="form-label">Pickup Location</label><input type="text" class="form-control" id="bookingPickup" value="${dcEscape(booking?.pickupLocation || "")}" required ></div><div class="col-md-6"><label class="form-label">Drop Location</label><input type="text" class="form-control" id="bookingDrop" value="${dcEscape(booking?.dropLocation || "")}" required></div><div class="col-md-3"><label class="form-label">Pickup Date</label><input type="date" class="form-control" id="bookingPickupDate" value="${dcEscape(booking?.pickupDate || "")}" required></div><div class="col-md-3"><label class="form-label">Pickup Time</label><input type="time" class="form-control" id="bookingPickupTime" value="${dcEscape(booking?.pickupTime || "")}" required></div><div class="col-md-3outstation-field"><label class="form-label">Return Date</label><input type="date" class="form-control" id="bookingReturnDate" value="${dcEscape(booking?.returnDate || "")}"></div><div class="col-md-3outstation-field"><label class="form-label">Return Time</label><input type="time" class="form-control" id="bookingReturnTime" value="${dcEscape(booking?.returnTime || "")}"></div><div class="col-md-3outstation-field"><label class="form-label">Distance (KM)</label><input type="number" min="0" step="0.01" class="form-control" id="bookingDistance" value="${booking?.estimatedDistanceKm || ""}"></div><div class="col-md-3outstation-field"><label class="form-label">Estimated Days</label><input type="number" min="1" class="form-control" id="bookingDays" value="${booking?.estimatedDays || ""}"></div><div class="col-md-6"><label class="form-label" >Vehicle Type</label><select class="form-select" id="bookingVehicleType"><option value="">Select Vehicle Type</option>${vehicleTypes.map(vehicleType => `<option value="${vehicleType.id}" ${Number(booking?.vehicleTypeId) === Number(vehicleType.id) ? "selected" : ""}>${dcEscape(vehicleType.name)} - ${dcEscape(vehicleType.code)}</option>`).join("")}</select></div><div class="col-md-6"><label class="form-label" >Vehicle</label><select class="form-select" id="bookingVehicle"><option value="">Select Vehicle</option>${vehicles.map(vehicle => `<option value="${vehicle.id}" ${Number(booking?.vehicleId) === Number(vehicle.id) ? "selected" : ""}>${dcEscape(vehicle.brand)} - ${dcEscape(vehicle.model || "")} - ${dcEscape(vehicle.vehicleNo || "")} (${dcEscape(vehicle.vehicleType || "")})</option>`).join("")}</select></div><div class="col-12"><hr><h6>Fare Breakdown</h6></div>${bookingMoneyField("bookingBaseFare", "Base Fare", booking?.baseFare)} ${bookingMoneyField("bookingDriverAllowance", "Driver Allowance", booking?.driverAllowance)} ${bookingMoneyField("bookingNightAllowance", "Night Allowance", booking?.nightAllowance)} ${bookingMoneyField("bookingToll", "Toll Charges", booking?.tollCharges)} ${bookingMoneyField("bookingParking", "Parking Charges", booking?.parkingCharges)} ${bookingMoneyField("bookingStateTax", "State Tax", booking?.stateTax)} ${bookingMoneyField("bookingOtherCharges", "Other Charges", booking?.otherCharges)} ${bookingMoneyField("bookingDiscount", "Discount", booking?.discountAmount)}<div class="col-md-3"><label class="form-label">Total Fare</label><input type="text" class=" form-control fw-bold " id="bookingFarePreview" readonly></div><div class="col-12"><label class="form-label">Remarks</label><textarea class="form-control" id="bookingRemarks" rows="3">${dcEscape(booking?.remarks || "")}</textarea></div></div></div><div class="card-footer bg-white text-end"><button type="submit" class="btn btn-primary"><i class="bi bi-check-lg me-1"></i>${id ? "Update Booking" : "Create Booking"}</button></div></form>`;
    } else {
      page.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4"><div><h4 class="mb-1">${id ? "Edit Booking" : "New Booking"}</h4><div class="text-muted">${id ? "Update trip and fare information." : "Create a local or outstation booking."}</div></div><button type="button" class="btn btn-outline-secondary" id="backBookingsBtn"><i class=" bi bi-arrow-left me-1"></i>Back</button></div><form id="bookingForm" class="card shadow-sm"><div class="card-body"><div class="row g-3"><div class="col-md-6"><label class="form-label" >Customer</label><select class="form-select" id="bookingCustomer" required ><option value="">Select Customer</option>${customers.map(customer => `<option value="${customer.id}" ${Number(booking?.customerId) === Number(customer.id) ? "selected" : ""}>${dcEscape(customer.name)} - ${dcEscape(customer.mobile || "")}</option>`).join("")}</select></div><div class="col-md-3"><label class="form-label">Trip Category</label><select class="form-select" id="bookingTripCategory"><option value="LOCAL" ${(booking?.tripCategory || "LOCAL") === "LOCAL" ? "selected" : ""}>Local</option><option value="OUTSTATION" ${booking?.tripCategory === "OUTSTATION" ? "selected" : ""}>Outstation</option></select></div><div class="col-md-3"><label class="form-label">Booking Type</label><select class="form-select" id="bookingType"><option value="ONE_WAY" ${(booking?.bookingType || "ONE_WAY") === "ONE_WAY" ? "selected" : ""}>One Way</option><option value="ROUND_TRIP" ${booking?.bookingType === "ROUND_TRIP" ? "selected" : ""}>Round Trip</option><option value="HOURLY" ${booking?.bookingType === "HOURLY" ? "selected" : ""}>Hourly</option></select></div><div class="col-md-6"><label class="form-label">Pickup Location</label><input type="text" class="form-control" id="bookingPickup" value="${dcEscape(booking?.pickupLocation || "")}" required ></div><div class="col-md-6"><label class="form-label">Drop Location</label><input type="text" class="form-control" id="bookingDrop" value="${dcEscape(booking?.dropLocation || "")}" required></div><div class="col-md-3"><label class="form-label">Pickup Date</label><input type="date" class="form-control" id="bookingPickupDate" value="${dcEscape(booking?.pickupDate || "")}" required></div><div class="col-md-3"><label class="form-label">Pickup Time</label><input type="time" class="form-control" id="bookingPickupTime" value="${dcEscape(booking?.pickupTime || "")}" required></div><div class="col-md-3outstation-field"><label class="form-label">Return Date</label><input type="date" class="form-control" id="bookingReturnDate" value="${dcEscape(booking?.returnDate || "")}"></div><div class="col-md-3outstation-field"><label class="form-label">Return Time</label><input type="time" class="form-control" id="bookingReturnTime" value="${dcEscape(booking?.returnTime || "")}"></div><div class="col-md-3outstation-field"><label class="form-label">Distance (KM)</label><input type="number" min="0" step="0.01" class="form-control" id="bookingDistance" value="${booking?.estimatedDistanceKm || ""}"></div><div class="col-md-3outstation-field"><label class="form-label">Estimated Days</label><input type="number" min="1" class="form-control" id="bookingDays" value="${booking?.estimatedDays || ""}"></div><div class="col-md-6"><label class="form-label" >Vehicle</label><select class="form-select" id="bookingVehicle"><option value="">Select Vehicle</option>${vehicles.map(vehicle => `<option value="${vehicle.id}" ${Number(booking?.vehicleId) === Number(vehicle.id) ? "selected" : ""}>${dcEscape(vehicle.brand)} - ${dcEscape(vehicle.model || "")} - ${dcEscape(vehicle.vehicleNo || "")} (${dcEscape(vehicle.vehicleType || "")})</option>`).join("")}</select></div><div class="col-12"><hr><h6>Fare Breakdown</h6></div>${bookingMoneyField("bookingBaseFare", "Base Fare", booking?.baseFare)} ${bookingMoneyField("bookingDriverAllowance", "Driver Allowance", booking?.driverAllowance)} ${bookingMoneyField("bookingNightAllowance", "Night Allowance", booking?.nightAllowance)} ${bookingMoneyField("bookingToll", "Toll Charges", booking?.tollCharges)} ${bookingMoneyField("bookingParking", "Parking Charges", booking?.parkingCharges)} ${bookingMoneyField("bookingStateTax", "State Tax", booking?.stateTax)} ${bookingMoneyField("bookingOtherCharges", "Other Charges", booking?.otherCharges)} ${bookingMoneyField("bookingDiscount", "Discount", booking?.discountAmount)}<div class="col-md-3"><label class="form-label">Total Fare</label><input type="text" class=" form-control fw-bold " id="bookingFarePreview" readonly></div><div class="col-12"><label class="form-label">Remarks</label><textarea class="form-control" id="bookingRemarks" rows="3">${dcEscape(booking?.remarks || "")}</textarea></div></div></div><div class="card-footer bg-white text-end"><button type="submit" class="btn btn-primary"><i class="bi bi-check-lg me-1"></i>${id ? "Update Booking" : "Create Booking"}</button></div></form>`;
    }

    document.getElementById("backBookingsBtn").addEventListener("click", () => { bookingsPage(); });
    const tripCategory = document.getElementById("bookingTripCategory");
    const bookingType = document.getElementById("bookingType");

    function updateOutstationFields() {
      const isOutstation = tripCategory.value === "OUTSTATION";
      document.querySelectorAll(".outstation-field").forEach(field => { field.classList.toggle("d-none", !isOutstation); });
      const returnDate = document.getElementById("bookingReturnDate");
      returnDate.required = isOutstation && bookingType.value === "ROUND_TRIP";
    }

    tripCategory.addEventListener("change", updateOutstationFields);
    bookingType.addEventListener("change", updateOutstationFields);
    const fareFields = ["bookingBaseFare", "bookingDriverAllowance", "bookingNightAllowance", "bookingToll", "bookingParking", "bookingStateTax", "bookingOtherCharges", "bookingDiscount"];
    fareFields.forEach(id => { document.getElementById(id).addEventListener("input", calculateBookingFarePreview); });
    updateOutstationFields();
    calculateBookingFarePreview();
    document.getElementById("bookingForm").addEventListener("submit", async event => {
      event.preventDefault();
      try {
        if(id) {
          const payload = collectBookingFormData("edit");   //console.log(payload);
          await api(`/bookings/${id}`, {method: "PUT", body: JSON.stringify(payload)});
        } else {
          const payload = collectBookingFormData();   //console.log(payload);
          await api("/bookings", {method: "POST", body: JSON.stringify(payload)});
        }
        showGlobalAlert("success", id ? "Booking updated successfully." : "Booking created successfully.");
        await bookingsPage();
      } catch(error) {
        showGlobalAlert("danger", error.message);
      }
    });
  } catch(error) {
    page.innerHTML = `<div class="alert alert-danger">${dcEscape(error.message)}</div>`;
  }
}

function bookingMoneyField(id, label, value = 0) {
  return `<div class="col-md-3"><label class="form-label" for="${id}">${dcEscape(label)}</label><input type="number" min="0" step="0.01" class="form-control" id="${id}" value="${Number(value || 0)}"></div>`;
}

function bookingNumber(id) {
  const element = document.getElementById(id);
  if(!element) {
    return 0;
  }
  const value = Number(element.value);
  return Number.isFinite(value) ? value : 0;
}

function calculateBookingFarePreview() {
  const total = bookingNumber("bookingBaseFare") + bookingNumber("bookingDriverAllowance") + bookingNumber("bookingNightAllowance") + bookingNumber("bookingToll") + bookingNumber("bookingParking") + bookingNumber("bookingStateTax") + bookingNumber("bookingOtherCharges") - bookingNumber("bookingDiscount");
  const preview = document.getElementById("bookingFarePreview");
  if(preview) {
    preview.value = formatMoney(Math.max(total, 0));
  }
}

function collectBookingFormData(mode = "create") {
  if(mode === "create") {
    return {
      customerId: Number(document.getElementById("bookingCustomer").value),
      tripCategory: document.getElementById("bookingTripCategory").value,
      bookingType: document.getElementById("bookingType").value,
      pickupLocation: document.getElementById("bookingPickup").value.trim(),
      dropLocation: document.getElementById("bookingDrop").value.trim(),
      pickupDate: document.getElementById("bookingPickupDate").value,
      pickupTime: document.getElementById("bookingPickupTime").value,
      returnDate: document.getElementById("bookingReturnDate").value || null,
      returnTime: document.getElementById("bookingReturnTime").value || null,
      estimatedDistanceKm: bookingNumber("bookingDistance") || null,
      estimatedDays: bookingNumber("bookingDays") || null,
      vehicleId: Number(document.getElementById("bookingVehicle").value),
      baseFare: bookingNumber("bookingBaseFare"),
      driverAllowance: bookingNumber("bookingDriverAllowance"),
      nightAllowance: bookingNumber("bookingNightAllowance"),
      tollCharges: bookingNumber("bookingToll"),
      parkingCharges: bookingNumber("bookingParking"),
      stateTax: bookingNumber("bookingStateTax"),
      otherCharges: bookingNumber("bookingOtherCharges"),
      discountAmount: bookingNumber("bookingDiscount"),
      remarks: document.getElementById("bookingRemarks").value.trim()
    };
  } else{
    return {
      customerId: Number(document.getElementById("bookingCustomer").value),
      tripCategory: document.getElementById("bookingTripCategory").value,
      bookingType: document.getElementById("bookingType").value,
      pickupLocation: document.getElementById("bookingPickup").value.trim(),
      dropLocation: document.getElementById("bookingDrop").value.trim(),
      pickupDate: document.getElementById("bookingPickupDate").value,
      pickupTime: document.getElementById("bookingPickupTime").value,
      returnDate: document.getElementById("bookingReturnDate").value || null,
      returnTime: document.getElementById("bookingReturnTime").value || null,
      estimatedDistanceKm: bookingNumber("bookingDistance") || null,
      estimatedDays: bookingNumber("bookingDays") || null,
      vehicleTypeId: Number(document.getElementById("bookingVehicleType").value),
      vehicleId: Number(document.getElementById("bookingVehicle").value),
      baseFare: bookingNumber("bookingBaseFare"),
      driverAllowance: bookingNumber("bookingDriverAllowance"),
      nightAllowance: bookingNumber("bookingNightAllowance"),
      tollCharges: bookingNumber("bookingToll"),
      parkingCharges: bookingNumber("bookingParking"),
      stateTax: bookingNumber("bookingStateTax"),
      otherCharges: bookingNumber("bookingOtherCharges"),
      discountAmount: bookingNumber("bookingDiscount"),
      remarks: document.getElementById("bookingRemarks").value.trim()
    };
  }
}

/*
async function assign(id) {
  const drivers = await api("/drivers?status=ACTIVE");
  const available = drivers.filter(d => d.availability === "AVAILABLE");
  if (!available.length) return alert("No available drivers.");
  const name = prompt("Enter driver ID:\n" + available.map(d => `${d.id}: ${d.name}`).join("\n"));
  if (!name) return;
  try {
    await api(`/bookings/${id}/assign-driver`, { method:"POST", body:JSON.stringify({driverId:Number(name)}) });
    bookings();
  } catch(err) { alert(err.message); }
}
*/

async function assignBookingDriverForm(bookingId) {
  try {
    const [
      booking,
      driverResult,
      vehicleResult
    ] = await Promise.all([
      api(`/bookings/${bookingId}`),
      api("/drivers?availability=AVAILABLE&status=ACTIVE&limit=100"),
      api("/vehicles?&status=ACTIVE&limit=100")
    ]);
    const drivers = driverResult.data || driverResult || [];
    const vehicles = vehicleResult.data || vehicleResult || [];
    const page = document.getElementById("page");
    page.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4"><div><h4 class="mb-1">Assign Driver</h4><div class="text-muted">${dcEscape(booking.bookingNo)}</div></div><button type="button" class="btn btn-outline-secondary" id="backBookingsBtn"><i class=" bi bi-arrow-left me-1"></i>Back</button></div><form id="bookingAssignmentForm" class="card shadow-sm"><div class="card-body"><div class="row g-3"><div class="col-md-6"><label class="form-label">Driver</label><select class="form-select" id="assignmentDriver" required><option value="">Select Driver</option>${drivers.map( driver => `<option value="${driver.id}">${dcEscape(driver.name)} - ${dcEscape(driver.mobile || "")}</option>`).join("")}</select></div><div class="col-md-6"><label class="form-label">Vehicle</label><select class="form-select" id="assignmentVehicle"><option value="">No Vehicle</option>${vehicles.map(vehicle => `<option value="${vehicle.id}">${dcEscape(vehicle.registrationNo || vehicle.vehicleNo || `Vehicle ${vehicle.id}`)}</option>`).join("")}</select></div></div></div><div class="card-footer bg-white d-flex justify-content-end gap-2"><button type="button" class="btn btn-outline-secondary" id="cancelAssignmentBtn" >Cancel</button><button type="submit" class="btn btn-primary">Assign Driver</button></div></form>`;

	document.getElementById("backBookingsBtn").addEventListener("click", () => { bookingsPage(); });
    document.getElementById("cancelAssignmentBtn").addEventListener("click", () => { bookingsPage(); });
    document.getElementById("bookingAssignmentForm").addEventListener("submit", async event => {
      event.preventDefault();
      try {
        await api(`/bookings/${bookingId}/assign-driver`, {method: "POST", body: JSON.stringify({
            driverId: Number(document.getElementById("assignmentDriver").value),
            vehicleId: document.getElementById("assignmentVehicle").value ? Number(document.getElementById("assignmentVehicle").value) : null
          })
        });
        showGlobalAlert("success", "Driver assigned successfully.");
        await bookingsPage();
      } catch(error) {
        showGlobalAlert("danger", error.message);
      }
    });
  } catch(error) {
    showGlobalAlert("danger", error.message);
  }
}

async function bookingStatusForm(bookingId) {
  try {
    const booking = await api(`/bookings/${bookingId}`);
    const page = document.getElementById("page");
    const statuses = ["PENDING", "CONFIRMED", "ASSIGNED", "ACCEPTED", "STARTED", "COMPLETED"];
    page.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4"><div><h4 class="mb-1">Change Booking Status</h4><div class="text-muted">${dcEscape(booking.bookingNo)}</div></div><button type="button" class="btn btn-outline-secondary" id="backBookingsBtn"><i class=" bi bi-arrow-left me-1"></i>Back</button></div><form id="bookingStatusForm" class="card shadow-sm"><div class="card-body"><label class="form-label">Status</label><select class="form-select" id="bookingNewStatus">${statuses.map(status => `<option value = "${status}" ${booking.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></div><div class="card-footer bg-white text-end"><button type="submit" class="btn btn-primary">Update Status</button></div></form>`;

	document.getElementById("backBookingsBtn").addEventListener("click", () => { bookingsPage(); });
    document.getElementById("bookingStatusForm").addEventListener("submit", async event => {
      event.preventDefault();
      try {
        await api(`/bookings/${bookingId}/status`, {method: "POST", body: JSON.stringify({status: document.getElementById("bookingNewStatus").value})});
        showGlobalAlert("success", "Booking status updated.");
        await bookingsPage();
      } catch(error) {
        showGlobalAlert("danger", error.message);
      }
    });
  } catch(error) {
    showGlobalAlert("danger", error.message);
  }
}

async function bookingCommissionForm(bookingId) {
  try {
    const booking = await api(`/bookings/${bookingId}`);
    const page = document.getElementById("page");
    page.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-4"><div><h4 class="mb-1">Driver Commission</h4><div class="text-muted">${dcEscape(booking.bookingNo)}</div></div><button type="button" class="btn btn-outline-secondary" id="backBookingsBtn"><i class=" bi bi-arrow-left me-1"></i>Back</button></div><form id="bookingCommissionForm" class="card shadow-sm"><div class="card-body"><div class="row g-3"><div class="col-md-4"><label class="form-label">Type</label><select class="form-select" id="bookingCommissionType"><option value="PERCENTAGE" ${booking.driverCommissionType === "PERCENTAGE" ? "selected" : ""}>Percentage</option><option value="FIXED" ${booking.driverCommissionType === "FIXED" ? "selected" : ""}>Fixed</option></select></div><div class="col-md-4"><label class="form-label">Rate</label><input type="number" min="0" step="0.01" class="form-control" id="bookingCommissionRate" value="${Number(booking.driverCommissionRate || 0)}"></div><div class="col-md-4 d-flex align-items-end"><div class="form-check form-switch mb-2"><input type="checkbox" class="form-check-input" id="bookingCommissionAllowances" ${booking.driverCommissionIncludeAllowances ? "checked" : ""}><label class="form-check-label">Include Allowances</label></div></div><div class="col-md-6"><div class="border rounded p-3 bg-light"><small class="text-muted">Current Commission</small><div class="fs-5 fw-semibold">${formatMoney(booking.driverCommissionAmount)}</div></div></div><div class="col-md-6"><div class="border rounded p-3 bg-light"><small class="text-muted">Driver Net Earning</small><div class="fs-5 fw-semibold">${formatMoney(booking.driverNetEarning)}</div></div></div></div></div><div class="card-footer bg-white text-end"><button type="submit" class="btn btn-primary">Update Commission</button></div></form>`;

	document.getElementById("backBookingsBtn").addEventListener("click", () => { bookingsPage(); });
    document.getElementById("bookingCommissionForm").addEventListener("submit", async event => {
      event.preventDefault();
      try {
        await api(`/bookings/${bookingId}/commission`, {method: "PUT", body: JSON.stringify({
            type: document.getElementById("bookingCommissionType").value,
            rate: Number(document.getElementById("bookingCommissionRate").value || 0),
            includeAllowances: document.getElementById("bookingCommissionAllowances").checked
          })
        });
        showGlobalAlert("success", "Booking commission updated.");
        await bookingsPage();
      } catch(error) {
        showGlobalAlert("danger", error.message);
      }
    });
  } catch(error) {
    showGlobalAlert("danger", error.message);
  }
}

async function cancelBookingForm(bookingId) {
  const reason = window.prompt("Enter cancellation reason:");
  if(reason === null) {
    return;
  }
  try {
    await api(`/bookings/${bookingId}/cancel`, {method: "POST", body: JSON.stringify({reason})});
    showGlobalAlert("success", "Booking cancelled successfully.");
    await bookingsPage();
  } catch(error) {
    showGlobalAlert("danger", error.message);
  }
}

async function deleteBooking(bookingId) {
  if(!window.confirm("Delete this pending booking permanently?")) {
    return;
  }
  try {
    await api(`/bookings/${bookingId}`, {method: "DELETE"});
    showGlobalAlert("success", "Booking deleted successfully.");
    await bookingsPage();
  } catch(error) {
    showGlobalAlert("danger", error.message);
  }
}

function renderBookingPagination(pagination) {
  const container = document.getElementById("bookingPagination");
  if(!container) {
    return;
  }
  /*
   * Expected pagination:
   *
   * {
   *   page: 1,
   *   limit: 20,
   *   total: 125,
   *   totalPages: 7
   * }
   */
  if(!pagination || !pagination.totalPages || pagination.totalPages <= 1) {
    container.innerHTML = "";
    return;
  }
  const currentPage = Number(pagination.page || 1);
  const totalPages = Number(pagination.totalPages || 1);
  const total = Number(pagination.total || 0);
  const limit = Number(pagination.limit || 20);
  const startRecord = total === 0 ? 0 : (
    (currentPage - 1) * limit) + 1;
  const endRecord = Math.min(currentPage * limit, total);
  const pages = getBookingPaginationPages(currentPage, totalPages);
  let pageButtons = "";
  
  pages.forEach(page => {
    if(page === "...") {
      pageButtons += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
      return;
    }
    pageButtons += `<li class="page-item ${page === currentPage ? "active" : ""}"><button type="button" class="page-link" data-booking-page="${page}">${page}</button></li>`;
  });
  
  container.innerHTML = `<div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3"><div class="small text-muted">Showing <strong>${startRecord}</strong> to <strong>${endRecord}</strong> of <strong>${total}</strong> bookings</div><nav aria-label="Booking pagination"><ul class="pagination pagination-sm mb-0"><li class="page-item ${currentPage <= 1 ? "disabled" : ""}"><button type="button" class="page-link" data-booking-page="${currentPage - 1}" ${currentPage <= 1 ? "disabled" : ""}><i class="bi bi-chevron-left"></i><span class="d-none d-sm-inline ms-1">Previous</span></button></li>${pageButtons}<li class="page-item${currentPage >= totalPages ? "disabled" : ""}"><button type="button" class="page-link" data-booking-page="${currentPage + 1}" ${currentPage >= totalPages ? "disabled" : ""}><span class="d-none d-sm-inline me-1">Next</span><i class="bi bi-chevron-right"></i></button></li></ul></nav></div>`;

  container.querySelectorAll("[data-booking-page]").forEach(button => {
    button.addEventListener("click", () => {
      if(button.disabled) {
        return;
      }
      const page = Number(button.dataset.bookingPage);
      if(!Number.isInteger(page) || page < 1 || page > totalPages || page === currentPage) {
        return;
      }
      bookingsPage(page);
    });
  });
}

async function bookingDetailsPage(bookingId) {
  const page = document.getElementById("page");
  if(!page) {
    return;
  }
  page.innerHTML = `<div class="d-flex justify-content-center py-5 "><div class="spinner-border text-primary" role="status"></div></div>`;
  try {
    const booking = await api(`/bookings/${bookingId}`);
    const statusClasses = {
      PENDING: "secondary",
      CONFIRMED: "primary",
      ASSIGNED: "info",
      ACCEPTED: "info",
      STARTED: "warning",
      COMPLETED: "success",
      CANCELLED: "danger"
    };
    const statusClass = statusClasses[booking.status] || "secondary";
    const tripBadgeClass = booking.tripCategory === "OUTSTATION" ? "warning" : "secondary";
    const canEdit = !["COMPLETED", "CANCELLED"].includes(booking.status);
    page.innerHTML = `<div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4"><div><h4 class="mb-1"><i class="bi bi-calendar-check me-2"></i>Booking Details</h4><div class="text-muted">${dcEscape(booking.bookingNo || `Booking#${booking.id}`)}</div></div><div class="d-flex flex-wrap gap-2">${canEdit ? `<button type="button" class="btn btn-outline-primary" id="editBookingDetailsBtn"><i class="bi bi-pencil me-1"></i>Edit</button><button type="button" class="btn btn-outline-success" id="assignBookingDriverBtn"><i class="bi bi-person-check me-1"></i>Assign Driver</button><button type="button" class="btn btn-outline-warning" id="changeBookingStatusBtn"><i    class="bi bi-arrow-repeat me-1"></i>Status</button><button type="button" class="btn btn-outline-dark" id="changeBookingCommissionBtn"><i class="bi bi-percent me-1"></i>Commission</button>` : ""}<button type="button" class="btn btn-outline-secondary" id="backToBookingsBtn"><i class="bi bi-arrow-left me-1"></i>Back</button></div></div><div class="row g-4"><!-- Booking Summary --><div class="col-xl-8"><div class="card shadow-sm mb-4"><div class="card-header bg-white d-flex justify-content-between align-items-center"><div><h6 class="mb-0">Booking Summary</h6></div><div class="d-flex gap-2"><span class="badge text-bg-${tripBadgeClass}">${dcEscape(booking.tripCategory || "LOCAL")}</span><span class="badge text-bg-${statusClass}">${dcEscape(booking.status || "-")}</span></div></div><div class="card-body"><div class="row g-4"><div class="col-md-6"><div class="small text-muted mb-1">Booking Number</div><div class="fw-semibold">${dcEscape(booking.bookingNo || `#${booking.id}`)}</div></div><div class="col-md-3"><div class="small text-muted mb-1">Trip Category</div><div>${dcEscape(booking.tripCategory || "-")}</div></div><div class="col-md-3"><div class="small text-muted mb-1">Booking Type</div><div>${formatBookingType(booking.bookingType)}</div></div><div class="col-md-6"><div class="small text-muted mb-1">Pickup Location</div><div><i class="bi bi-geo-alt me-1 text-primary"></i>${dcEscape(booking.pickupLocation || "-")}</div></div><div class="col-md-6"><div class="small text-muted mb-1">Drop Location</div><div><i class="bi bi-geo me-1 text-danger"></i>${dcEscape(booking.dropLocation || "-")}</div></div><div class="col-md-3"><div class="small text-muted mb-1">Pickup Date</div><div>${dcEscape(booking.pickupDate || "-")}</div></div><div class="col-md-3"><div class="small text-muted mb-1">Pickup Time</div><div>${formatBookingTime(booking.pickupTime)}</div></div>${booking.returnDate ? `<div class="col-md-3"><div class="small text-muted mb-1">Return Date</div><div>${dcEscape(booking.returnDate)}</div></div>` : ""} ${booking.returnTime ? `<div class="col-md-3"><div class="small text-muted mb-1">Return Time</div><div>${formatBookingTime(booking.returnTime)}</div></div>` : ""} ${booking.estimatedDistanceKm ? `<div class="col-md-3"><div class="small text-muted mb-1">Estimated Distance</div><div>${Number(booking.estimatedDistanceKm).toLocaleString("en-IN")} km</div></div>` : ""} ${booking.estimatedDays ? `<div class="col-md-3"><div class="small text-muted mb-1">Estimated Days</div><div>${Number(booking.estimatedDays)}</div></div>` : ""} <div class="col-md-3"><div class="small text-muted mb-1">Requested Vehicle Type</div><div>${dcEscape(booking.vehicleType || "-")}</div></div><div class="col-md-3"><div class="small text-muted mb-1">Created</div><div>${formatBookingDateTime(booking.createdAt)}</div></div></div></div></div><!-- Customer --><div class="card shadow-sm mb-4"><div class="card-header bg-white"><h6 class="mb-0"><i class="bi bi-person me-2"></i>Customer</h6></div><div class="card-body">${booking.customer ? `<div class="row g-3"><div class="col-md-4"><div class="small text-muted">Name</div><div class="fw-semibold">${dcEscape(booking.customer.name || "-")}</div></div><div class="col-md-4"><div class="small text-muted">Mobile</div><div>${dcEscape(booking.customer.mobile || "-")}</div></div><div class="col-md-4"><div class="small text-muted">Email</div><div>${dcEscape(booking.customer.email || "-")}</div></div><div class="col-md-4"><div class="small text-muted">Customer Code</div><div>${dcEscape(booking.customer.customerCode || "-")}</div></div></div>` : `<div class="text-muted">Customer information is unavailable.</div>`}</div></div><!-- Driver and Vehicle --><div class="row g-4"><div class="col-lg-6"><div class="card shadow-sm h-100"><div class="card-header bg-white"><h6 class="mb-0"><i class="bi bi-person-badge me-2"></i>Driver</h6></div><div class="card-body">${booking.driver ? `<div class="mb-3"><div class="fs-5 fw-semibold">${dcEscape(booking.driver.name || "-")}</div><div class="text-muted">${dcEscape(booking.driver.driverCode || "")}</div></div><div class="mb-2"><i class="bi bi-telephone me-2"></i>    ${dcEscape(booking.driver.mobile || "-")}</div><div><span class="badge text-bg-${getDriverAvailabilityClass(booking.driver.availability)}">${dcEscape(booking.driver.availability || "-")}</span></div>` : `<div class="text-muted">No driver assigned.</div>${canEdit ? `<button type="button" class="btn btn-sm btn-outline-primary mt-3" id="assignDriverInlineBtn">Assign Driver</button>` : ""}`}</div></div></div><div class="col-lg-6"><div class="card shadow-sm h-100"><div class="card-header bg-white"><h6 class="mb-0"><i class="bi bi-car-front me-2"></i>Vehicle</h6></div><div class="card-body">${booking.vehicle ? `<div class = "mb-2"><div class="fs-5 fw-semibold">${dcEscape(booking.vehicle.registrationNo || booking.vehicle.vehicleNo || `Vehicle #${booking.vehicle.id}`)}</div></div>${booking.vehicle.make || booking.vehicle.model ? `<div class="mb-2">${dcEscape([booking.vehicle.make, booking.vehicle.model].filter(Boolean).join(" "))}</div>` : ""} ${booking.vehicle.type || booking.vehicle.vehicleType ? `<div class="text-muted"> ${dcEscape(booking.vehicle.type || booking.vehicle.vehicleType)}</div>` : ""}` : `<div class="text-muted">No vehicle assigned.</div>`}</div></div></div></div></div><!-- Fare Side Panel --><div class="col-xl-4"><div class="card shadow-sm mb-4"><div class="card-header bg-white"><h6 class="mb-0">Fare Breakdown</h6></div><div class="card-body">${bookingFareDetailRow("Base Fare", booking.baseFare)} ${bookingFareDetailRow("Driver Allowance", booking.driverAllowance)} ${bookingFareDetailRow("Night Allowance", booking.nightAllowance)} ${bookingFareDetailRow("Toll Charges", booking.tollCharges)} ${bookingFareDetailRow("Parking Charges", booking.parkingCharges)} ${bookingFareDetailRow("State Tax", booking.stateTax)} ${bookingFareDetailRow("Other Charges", booking.otherCharges)} ${bookingFareDetailRow("Discount", booking.discountAmount, true)}<hr><div class="d-flex justify-content-between align-items-center"><span class="fw-semibold">Total Fare</span><span class="fs-5 fw-bold">${formatMoney(booking.fare)}</span></div></div></div><!-- Commission --><div class="card shadow-sm mb-4"><div class="card-header bg-white d-flex justify-content-between align-items-center"><h6 class="mb-0">Driver Commission</h6>${canEdit ? `<button type="button" class="btn btn-sm btn-outline-secondary" id="editCommissionInlineBtn">Edit</button>` : ""}</div><div class="card-body"><div class="d-flex justify-content-between mb-2"><span class="text-muted">Type</span><span>${dcEscape(booking.driverCommissionType || "-")}</span></div><div class="d-flex justify-content-between mb-2"><span class="text-muted">Rate </span><span>${booking.driverCommissionType === "PERCENTAGE" ? `${Number(booking.driverCommissionRate || 0)}%` : formatMoney(booking.driverCommissionRate)}</span></div><div class="d-flex justify-content-between mb-2"><span class="text-muted">Include Allowances</span><span>${booking.driverCommissionIncludeAllowances ? "Yes" : "No"}</span></div><hr><div class="d-flex justify-content-between mb-2"><span class="text-muted">Commission</span><strong>${formatMoney(booking.driverCommissionAmount)}</strong></div><div class="d-flex justify-content-between"><span class="text-muted">Driver Net Earning</span><strong class="text-success">${formatMoney(booking.driverNetEarning)}</strong></div></div></div><!-- Remarks --><div class="card shadow-sm mb-4"><div class="card-header bg-white"><h6 class="mb-0">Remarks</h6></div><div class="card-body"><div class="text-muted booking-remarks">${booking.remarks ? dcEscape(booking.remarks).replace(/\n/g, "<br>") : "No remarks available."}</div></div></div><!-- Cancellation Reason --><div class="card shadow-sm mb-4"><div class="card-header bg-white"><h6 class="mb-0">Cancellation Date & Reason</h6></div><div class="card-body"><div class="text-muted booking-remarks">${booking.cancelledAt ? ("<b>Date: </b>" + formatBookingDateTime(booking.cancelledAt) + "</br>") : ""}${booking.cancellationReason ? dcEscape(booking.cancellationReason).replace(/\n/g, "<br>") : "No cancellation reason available."}</div></div></div>${canEdit ? `<div class="card shadow-sm border-danger"><div class="card-body"><h6 class="text-danger">Booking Actions</h6><p class="small text-muted">Cancel the booking while preserving its operational history.</p><button type="button" class="btn btn-outline-danger w-100" id="cancelBookingDetailsBtn"><i class="bi bi-x-circle me-1"></i>Cancel Booking</button></div></div>` : ""}</div></div>`;

    /*
     * Back
     */
    document.getElementById("backToBookingsBtn")?.addEventListener("click", () => { bookingsPage(); });
    /*
     * Edit
     */
    document.getElementById("editBookingDetailsBtn")?.addEventListener("click", () => { bookingForm(booking.id); });
    /*
     * Assign Driver
     */
    document.getElementById("assignBookingDriverBtn")?.addEventListener("click", () => { assignBookingDriverForm(booking.id); });
    document.getElementById("assignDriverInlineBtn")?.addEventListener("click", () => { assignBookingDriverForm(booking.id); });
    /*
     * Status
     */
    document.getElementById("changeBookingStatusBtn")?.addEventListener("click", () => { bookingStatusForm(booking.id); });
    /*
     * Commission
     */
    document.getElementById("changeBookingCommissionBtn")?.addEventListener("click", () => { bookingCommissionForm(booking.id); });
    document.getElementById("editCommissionInlineBtn")?.addEventListener("click", () => { bookingCommissionForm(booking.id); });
    /*
     * Cancel Booking
     */
    document.getElementById("cancelBookingDetailsBtn")?.addEventListener("click", () => { cancelBookingForm(booking.id); });
  } catch(error) {
    page.innerHTML = `<div class="alert alert-danger"><div class="d-flex justify-content-between align-items-center"><div><i class="bi bi-exclamation-triangle me-2"></i>${dcEscape(error.message || "Unable to load booking details.")}</div><button type="button" class="btn btn-sm btn-outline-danger" id="bookingDetailsErrorBackBtn">Back</button></div></div>`;
    document.getElementById("bookingDetailsErrorBackBtn")?.addEventListener("click", () => {
      bookingsPage();
    });
  }
}

function formatBookingType(type) {
  const labels = {ONE_WAY: "One Way", ROUND_TRIP: "Round Trip", HOURLY: "Hourly"};

  if (!type) {
      return "-";
  }

  return labels[type] || dcEscape(type);
}

function formatBookingTime(value) {
  if (!value) {
      return "-";
  }

  /*
   * Expected values:
   *
   * 08:30
   * 08:30:00
   * 18:45
   * 18:45:00
   */

  const parts = String(value).trim().split(":");

  if (parts.length < 2) {
      return String(value);
  }

  const hour = Number(parts[0]);
  const minute = String(parts[1]).padStart(2, "0");

  /*
   * Validate hour/minute.
   */
  const minuteNumber = Number(minute);

  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minuteNumber) || minuteNumber < 0 || minuteNumber > 59) {
      return String(value);
  }

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${period}`;
}

function formatBookingDateTime(value) {
  if (!value) {
      return "-";
  }

  const date = new Date(value);

  /*
   * Invalid date protection
   */
  if (Number.isNaN(date.getTime())) {
      return String(value);
  }

  try {
      return date.toLocaleString("en-IN", {day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true});
  } catch (error) {
      console.warn("Unable to format booking date/time:", value, error);
      return String(value);
  }
}

function bookingFareDetailRow(label, amount, isDiscount = false) {
  /*
   * Sequelize DECIMAL values may arrive
   * as strings, e.g. "1500.00".
   */
  const numericAmount = Number(amount);
  const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;

  /*
   * Do not display rows whose value is 0.
   */
  if (safeAmount === 0) {
      return "";
  }

  /*
   * Discounts are displayed as negative
   * amounts even though the database stores
   * discountAmount as a positive number.
   */
  const displayAmount = Math.abs(safeAmount);

  return `<div class="d-flex justify-content-between align-items-center mb-2"><span class="text-muted">${dcEscape(label || "-")}</span><span class="${isDiscount ? "text-danger" : ""}">${isDiscount ? "- " : ""} ${formatMoney(displayAmount)}</span></div>`;
}


// ===================================================
//   User Management + ACL page related function
// ===================================================
async function usersPage(){
  const rows = await api("/admin/users");
  page.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-3"><div><h2>Users</h2><p class="text-muted mb-0">Manage system accounts and roles</p></div><button class="btn btn-primary" id="userAdd">Add User</button></div><div class="card border-0 shadow-sm"><div class="card-body table-responsive"><table class="table table-hover"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr><td>${dcEscape(r.name)}</td><td>${dcEscape(r.email)}</td><td>${dcEscape(r.role)}</td><td>${dcEscape(r.status)}</td><td class="text-end"><button class="btn btn-sm btn-outline-primary me-1 uedit" data-id="${r.id}">Edit</button><button class="btn btn-sm btn-outline-danger udel" data-id="${r.id}">Delete</button></td></tr>`).join("")}</tbody></table></div></div>`;

  document.getElementById("userAdd").addEventListener("click",() => userForm());
  document.querySelectorAll(".uedit").forEach(b => b.addEventListener("click",() => userForm(Number(b.dataset.id))));
  document.querySelectorAll(".udel").forEach(b => b.addEventListener("click",async() => {
    if(confirm("Delete this user?")){
      await api(`/admin/users/${b.dataset.id}`,{method:"DELETE"});
      usersPage();
    }
  }));
}

async function userForm(id = null) {
    const editing = !!id,
        u = editing ? await api(`/admin/users/${id}`) : {};
    page.innerHTML = `<div class="d-flex justify-content-between mb-3"><h2>${editing?"Edit":"Add"} User</h2><button class="btn btn-outline-secondary" id="uback">Back</button></div><div id="uerr" class="alert alert-danger d-none"></div><div class="card border-0 shadow-sm"><div class="card-body"><form id="uf" class="row g-3" novalidate><div class="col-md-6"><label class="form-label">Name</label><input class="form-control" name="name" value="${dcEscape(u.name)}" required minlength="2"></div><div class="col-md-6"><label class="form-label">Email</label><input type="email" class="form-control" name="email" value="${dcEscape(u.email)}" required></div><div class="col-md-6"><label class="form-label">Password</label><input type="password" class="form-control" name="password" ${editing?"":"required minlength=8"}></div><div class="col-md-3"><label class="form-label">Role</label><select class="form-select" name="role">${["SUPER_ADMIN","ADMIN","MANAGER","STAFF","DRIVER","CUSTOMER"].map(x=>`<option ${u.role===x?"selected":""}>${x}</option>`).join("")}</select></div><div class="col-md-3"><label class="form-label">Status</label><select class="form-select" name="status">${["ACTIVE","INACTIVE"].map(x=>`<option ${u.status===x?"selected":""}>${x}</option>`).join("")}</select></div><div class="col-12"><button class="btn btn-primary">Save User</button></div></form></div></div>`;
    document.getElementById("uback").addEventListener("click", usersPage);
    document.getElementById("uf").addEventListener("submit", async e => {
        e.preventDefault();
        if (!e.target.checkValidity()) {
            e.target.classList.add("was-validated");
            return;
        }
        const body = Object.fromEntries(new FormData(e.target).entries());
        if (editing && !body.password) delete body.password;
        try {
            await api(editing ? `/admin/users/${id}` : "/admin/users", {method: editing ? "PUT" : "POST", body: JSON.stringify(body)});
            usersPage();
        } catch (err) {
            const x = document.getElementById("uerr");
            x.textContent = err.message;
            x.classList.remove("d-none");
        }
    });
}

async function aclPage() {
    const data = await api("/admin/acl"),
        roles = ["ADMIN", "MANAGER", "STAFF"],
        group = {};

    data.permissions.forEach(p => (group[p.module] ??= []).push(p));
    page.innerHTML = `<div class="mb-3"><h2>Access Control</h2><p class="text-muted">Configure permissions by role. Super Admin always has full access.</p></div>${roles.map(role=>`<div class="card border-0 shadow-sm mb-3"><div class="card-body"><h5>${role}</h5><form class="aclf" data-role="${role}">${Object.entries(group).map(([m,ps])=>`<div class="mb-3"><h6>${m}</h6><div class="row">${ps.map(p=>`<div class="col-md-4"><label class="form-check"><input class="form-check-input" type="checkbox" value="${p.id}" ${data.mappings.some(x=>x.role===role&&x.permissionId===p.id)?"checked":""}><span class="form-check-label">${dcEscape(p.name)}</span></label></div>`).join("")}</div></div>`).join("")}<button class="btn btn-primary">Save ${role}</button></form></div></div>`).join("")}`;

    document.querySelectorAll(".aclf").forEach(f => f.addEventListener("submit", async e => {
        e.preventDefault();
        const ids = [...f.querySelectorAll("input:checked")].map(x => Number(x.value));
        await api("/admin/acl", {
            method: "POST",
            body: JSON.stringify({
                role: f.dataset.role,
                permissionIds: ids
            })
        });
        alert("Permissions updated");
    }));
}


if (token) showApp();

async function reports() {
    const x = await api("/reports/summary");
    page.innerHTML = `<h2>Reports</h2><div class="row g-3">${kpi("Bookings",x.bookings,"bi-calendar-check")}${kpi("Revenue","₹"+x.revenue.toFixed(2),"bi-currency-rupee")}${kpi("Driver Earnings","₹"+x.driverNetEarnings.toFixed(2),"bi-wallet2")}</div><div class="card mt-4 border-0 shadow-sm"><div class="card-body"><a href="/api-docs" target="_blank">Swagger API Documentation</a></div></div>`;
}

function changePasswordForm() {
  page.innerHTML = `<div class="d-flex justify-content-between align-items-center mb-3"><div><h2 class="mb-1">Change Password</h2><p class="text-muted mb-0">Update the password for your current admin account.</p></div><button type="button" class="btn btn-outline-secondary" id="changePasswordBackBtn"><i class="bi bi-arrow-left me-1"></i>Back</button></div><div id="changePasswordError" class="alert alert-danger d-none"></div><div id="changePasswordSuccess" class="alert alert-success d-none"></div><div class="row"><div class="col-lg-6 col-xl-5"><div class="card border-0 shadow-sm"><div class="card-body"><form id="changePasswordForm" novalidate><div class="mb-3"><label for="currentPassword" class="form-label">Current Password<span class="text-danger">*</span></label><div class="input-group"><input type="password" class="form-control" id="currentPassword" name="currentPassword" autocomplete="current-password" required><button type="button" class="btn btn-outline-secondary toggle-password" data-target="currentPassword"><i class="bi bi-eye"></i></button></div><div class="invalid-feedback">Current password is required.</div></div><div class="mb-3"><label for="newPassword" class="form-label">New Password<span class="text-danger">*</span></label><div class="input-group"><input type="password" class="form-control" id="newPassword" name="newPassword" minlength="8" autocomplete="new-password" required><button type="button" class="btn btn-outline-secondary toggle-password" data-target="newPassword"><i class="bi bi-eye"></i></button></div><div class="invalid-feedback">Password must contain at least 8 characters.</div><div class="form-text">Use a strong password with uppercase, lowercase, number and special character.</div></div><div class="mb-4"><label for="confirmPassword" class="form-label">Confirm New Password<span class="text-danger">*</span></label><div class="input-group"><input type="password" class="form-control" id="confirmPassword" name="confirmPassword" minlength="8" autocomplete="new-password" required><button type="button" class="btn btn-outline-secondary toggle-password" data-target="confirmPassword"><i class="bi bi-eye"></i></button></div><div class="invalid-feedback">Confirm password is required.</div></div><div class="d-flex gap-2"><button type="submit" class="btn btn-primary" id="changePasswordSaveBtn"><i class="bi bi-key me-1"></i>Change Password</button><button type="button" class="btn btn-light" id="changePasswordCancelBtn">Cancel</button></div></form></div></div></div></div>`;

  const form = document.getElementById("changePasswordForm");
  const errorBox = document.getElementById("changePasswordError");
  const successBox = document.getElementById("changePasswordSuccess");
  const saveButton = document.getElementById("changePasswordSaveBtn");
  const goBack = () => { dashboard(); };

  document.getElementById("changePasswordBackBtn").addEventListener("click", goBack);
  document.getElementById("changePasswordCancelBtn").addEventListener("click", goBack);
  document.querySelectorAll(".toggle-password").forEach(button => {
    button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.target);
      const icon = button.querySelector("i");
      if (target.type === "password") {
        target.type = "text";
        icon.classList.remove("bi-eye");
        icon.classList.add("bi-eye-slash");
      } else {
        target.type = "password";
        icon.classList.remove("bi-eye-slash");
        icon.classList.add("bi-eye");
      }
    });
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();

    errorBox.classList.add("d-none");
    successBox.classList.add("d-none");
    errorBox.textContent = "";
    successBox.textContent = "";

    const currentPassword = document.getElementById("currentPassword");
    const newPassword = document.getElementById("newPassword");
    const confirmPassword = document.getElementById("confirmPassword");

    confirmPassword.setCustomValidity("");
    if (newPassword.value !== confirmPassword.value) {
      confirmPassword.setCustomValidity("Passwords do not match");
    }

    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    if (currentPassword.value === newPassword.value) {
      errorBox.textContent = "New password must be different from current password.";
      errorBox.classList.remove("d-none");
      return;
    }

    saveButton.disabled = true;
    saveButton.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span>Updating...`;

    try {
      await api("/auth/change-password",{method:"POST", body:JSON.stringify({currentPassword: currentPassword.value, newPassword: newPassword.value})});
      form.reset();

      form.classList.remove("was-validated");
      successBox.textContent = "Password changed successfully.";
      successBox.classList.remove("d-none");
    } catch (error) {
      errorBox.textContent = error.message || "Unable to change password.";
      errorBox.classList.remove("d-none");
    } finally {
      saveButton.disabled = false;
      saveButton.innerHTML = `<i class="bi bi-key me-1"></i>Change Password`;
    }
  });
}

async function applicationSettingsPage() {
  const page = document.getElementById("page");

  page.innerHTML = `<div class="d-flex justify-content-center align-items-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>`;
  try {
    const settings = await api("/admin/settings");
    const general = settings.general || {};
    const notifications = settings.notifications || {};
    const email = settings.email || {};
    const sms = settings.sms || {};
    const whatsapp = settings.whatsapp || {};
    const commission = settings.driverCommission || {};

    page.innerHTML = `<!-- ====================================== --><!-- PAGE HEADER --><!-- ====================================== --><div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4"><div><h4 class="mb-1"><i class="bi bi-gear me-2"></i>Application Settings</h4><div class="text-muted">Configure system preferences, notifications, messaging and driver commission.</div></div><button type="button" class="btn btn-primary" id="saveAllSettingsBtn"><i class="bi bi-check-lg me-1"></i>Save Settings</button></div><div id="settingsAlert" class="mb-3"></div><form id="applicationSettingsForm" novalidate><!-- ====================================== --><!-- GENERAL SETTINGS --><!-- ====================================== --><div class="card shadow-sm mb-4"><div class="card-header bg-white"><div class="d-flex align-items-center"><div class="settings-icon me-3"><i class="bi bi-building"></i></div><div><h5 class="mb-0">General Settings</h5><small class="text-muted">Basic application configuration.</small></div></div></div><div class="card-body"><div class="row g-3"><div class="col-md-6"><label for="settingCompanyName" class="form-label">Company Name</label><input type="text" class="form-control" id="settingCompanyName" value="${dcEscape(general.companyName || "")}" required><div class="invalid-feedback">Company name is required.</div></div><div class="col-md-6"><label for="settingCurrency" class="form-label">Currency</label><select class="form-select" id="settingCurrency" required><option value="INR" ${general.currency === "INR" ? "selected" : ""}>INR - Indian Rupee</option><option value="USD" ${general.currency === "USD" ? "selected" : ""}>USD - US Dollar</option><option value="EUR" ${general.currency === "EUR" ? "selected" : ""}>EUR - Euro</option><option value="GBP" ${general.currency === "GBP" ? "selected" : ""}>GBP - British Pound</option></select></div></div></div></div><!-- ====================================== --><!-- NOTIFICATIONS --><!-- ====================================== --><div class="card shadow-sm mb-4"><div class="card-header bg-white"><div class="d-flex justify-content-between align-items-center"><div class="d-flex align-items-center"><div class="settings-icon me-3"><i class="bi bi-bell"></i></div><div><h5 class="mb-0">Notifications</h5><small class="text-muted">Control system notification events.</small></div></div><div class="form-check form-switch"><input class="form-check-input" type="checkbox" role="switch" id="notificationEnabled" ${notifications.enabled ? "checked" : ""}><label class="form-check-label" for="notificationEnabled">Enabled</label></div></div></div><div class="card-body" id="notificationSettingsContainer"><div class="row g-3"><div class="col-md-4"><div class="settings-option"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="notifyBookingCreated" ${notifications.bookingCreated ? "checked" : ""}><label class="form-check-label fw-semibold" for="notifyBookingCreated">Booking Created</label></div><small class="text-muted d-block mt-2"> Notify customer after a new booking is created.</small></div></div><div class="col-md-4"><div class="settings-option"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="notifyDriverAssigned" ${notifications.driverAssigned ? "checked" : ""}><label class="form-check-label fw-semibold" for="notifyDriverAssigned">Driver Assigned</label></div><small class="text-muted d-block mt-2">Notify driver when a booking is assigned.</small></div></div><div class="col-md-4"><div class="settings-option"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="notifyBookingStatus" ${notifications.bookingStatusChanged ? "checked" : ""}><label class="form-check-label fw-semibold" for="notifyBookingStatus">Booking Status</label></div><small class="text-muted d-block mt-2">Notify customer whenever booking status changes.</small></div></div></div></div></div><!-- ====================================== --><!-- EMAIL SETTINGS --><!-- ====================================== --><div class="card shadow-sm mb-4"><div class="card-header bg-white"><div class="d-flex justify-content-between align-items-center"><div class="d-flex align-items-center"><div class="settings-icon me-3"><i class="bi bi-envelope"></i></div><div><h5 class="mb-0">Email</h5><small class="text-muted">Configure outgoing email notifications.</small></div></div><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="emailEnabled" ${email.enabled ? "checked" : ""}><label class="form-check-label" for="emailEnabled">Enabled</label></div></div></div><div class="card-body" id="emailSettingsContainer"><div class="row g-3"><div class="col-md-6"><label class="form-label" for="emailFromName">Sender Name</label><input type="text" class="form-control" id="emailFromName" value="${dcEscape(email.fromName || "")}" placeholder="Driver Center"></div><div class="col-md-6"><label class="form-label" for="emailFromAddress">Sender Email</label><input type="email" class="form-control" id="emailFromAddress" value="${dcEscape(email.fromEmail || "")}" placeholder="booking@example.com"></div></div><div class="alert alert-light border mt-3 mb-0"><i class="bi bi-shield-lock me-2"></i>SMTP host, username and password should remain in your server <code>.env</code> file.</div></div></div><!-- ====================================== --><!-- SMS SETTINGS --><!-- ====================================== --><div class="card shadow-sm mb-4"><div class="card-header bg-white"><div class="d-flex justify-content-between align-items-center"><div class="d-flex align-items-center"><div class="settings-icon me-3"><i class="bi bi-chat-left-text"></i></div><div><h5 class="mb-0">SMS</h5><small class="text-muted">SMS provider configuration.</small></div></div><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="smsEnabled" ${sms.enabled ? "checked" : ""}><label class="form-check-label" for="smsEnabled">Enabled</label></div></div></div><div class="card-body" id="smsSettingsContainer"><div class="row"><div class="col-md-6"><label for="smsProvider" class="form-label">SMS Provider</label><select class="form-select" id="smsProvider"><option value="NONE" ${!sms.provider || sms.provider === "NONE" ? "selected" : ""}>None</option><option value="TWILIO" ${sms.provider === "TWILIO" ? "selected" : ""}>Twilio</option><option value="MSG91" ${sms.provider === "MSG91" ? "selected" : ""}>MSG91</option><option value="AWS_SNS" ${sms.provider === "AWS_SNS" ? "selected" : ""}>AWS SNS</option></select></div></div><div class="alert alert-light border mt-3 mb-0">API credentials must be configured through server environment variables.</div></div></div><!-- ====================================== --><!-- WHATSAPP SETTINGS --><!-- ====================================== --><div class="card shadow-sm mb-4"><div class="card-header bg-white"><div class="d-flex justify-content-between align-items-center"><div class="d-flex align-items-center"><div class="settings-icon me-3"><i class="bi bi-whatsapp"></i></div><div><h5 class="mb-0">WhatsApp</h5><small class="text-muted">Configure WhatsApp booking messages.</small></div></div><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="whatsappEnabled" ${whatsapp.enabled ? "checked" : ""}><label class="form-check-label" for="whatsappEnabled">Enabled</label></div></div></div><div class="card-body" id="whatsappSettingsContainer"><div class="row"><div class="col-md-6"><label class="form-label" for="whatsappProvider">WhatsApp Provider</label><select class="form-select" id="whatsappProvider"><option value="NONE" ${!whatsapp.provider || whatsapp.provider === "NONE" ? "selected" : ""}>None</option><option value="TWILIO" ${whatsapp.provider === "TWILIO" ? "selected" : ""}>Twilio</option><option value="META" ${whatsapp.provider === "META" ? "selected" : ""}>Meta WhatsApp Cloud API</option></select></div></div></div></div><!-- ====================================== --><!-- DRIVER COMMISSION --><!-- ====================================== --><div class="card shadow-sm mb-4"><div class="card-header bg-white"><div class="d-flex align-items-center"><div class="settings-icon me-3"><i class="bi bi-percent"></i></div><div><h5 class="mb-0">Driver Commission</h5><small class="text-muted">Default commission applied to newly created bookings.</small></div></div></div><div class="card-body"><div class="row g-3"><div class="col-md-4"><label class="form-label" for="commissionType">Commission Type</label><select class="form-select" id="commissionType"><option value="PERCENTAGE" ${!commission.type || commission.type === "PERCENTAGE" ? "selected" : ""}>Percentage</option><option value="FIXED" ${commission.type === "FIXED" ? "selected" : ""}>Fixed Amount</option></select></div><div class="col-md-4"><label class="form-label" id="commissionValueLabel" for="commissionValue">Commission Value</label><div class="input-group"><span class="input-group-text" id="commissionPrefix">%</span><input type="number" min="0" step="0.01" class="form-control" id="commissionValue" value="${Number(commission.value || 0)}" required></div><div class="invalid-feedback">Enter a valid commission.</div></div><div class="col-md-4 d-flex align-items-end"><div class="form-check form-switch mb-2"><input class="form-check-input" type="checkbox" id="commissionIncludeAllowances" ${commission.includeAllowances ? "checked" : ""}><label class="form-check-label" for="commissionIncludeAllowances">Include Driver Allowances</label></div></div></div><div class="alert alert-info mt-4 mb-0"><i class="bi bi-info-circle me-2"></i>Changes here affect <strong>newly created bookings</strong>. Existing bookings retain their previously saved commission rate.</div><div class="border rounded bg-light p-3 mt-3"><div class="small text-muted mb-2">Commission Preview</div><div class="row g-2"><div class="col-md-4"><div class="fw-semibold">Example Base Fare</div><div>₹10,000</div></div><div class="col-md-4"><div class="fw-semibold">Platform Commission</div><div id="commissionPreviewAmount">₹0</div></div><div class="col-md-4"><div class="fw-semibold">Driver Earning</div><div id="commissionPreviewDriver">₹10,000</div></div></div></div></div></div><!-- ====================================== --><!-- BOTTOM ACTION --><!-- ====================================== --><div class="d-flex justify-content-end gap-2 mb-4"><button type="button" class="btn btn-outline-secondary" id="reloadSettingsBtn"><i class="bi bi-arrow-clockwise me-1"></i>Reload</button><button type="submit" class="btn btn-primary" id="settingsSubmitBtn"><i class="bi bi-check-lg me-1"></i>Save Settings</button></div></form>`;

    /*
     * ==========================================
     * DOM ELEMENTS
     * ==========================================
     */
    const form = document.getElementById("applicationSettingsForm");
    const alertContainer = document.getElementById("settingsAlert");
    const notificationEnabled = document.getElementById("notificationEnabled");
    const emailEnabled = document.getElementById("emailEnabled");
    const smsEnabled = document.getElementById("smsEnabled");
    const whatsappEnabled = document.getElementById("whatsappEnabled");
    const commissionType = document.getElementById("commissionType");
    const commissionValue = document.getElementById("commissionValue");
    const commissionPrefix = document.getElementById("commissionPrefix");
    const commissionValueLabel = document.getElementById("commissionValueLabel");
    const saveAllBtn = document.getElementById("saveAllSettingsBtn");
    const submitBtn = document.getElementById("settingsSubmitBtn");

    /*
     * ==========================================
     * ENABLE / DISABLE SECTIONS
     * ==========================================
     */
    function updateSectionState(enabled, containerId) {
      const container =  document.getElementById(containerId);
      if (!container) {
        return;
      }

      container.querySelectorAll("input, select, textarea, button").forEach(element => {element.disabled = !enabled;});
      container.classList.toggle("settings-disabled", !enabled);
    }

    function refreshToggleStates() {
      updateSectionState(notificationEnabled.checked, "notificationSettingsContainer");
      updateSectionState(emailEnabled.checked, "emailSettingsContainer");
      updateSectionState(smsEnabled.checked, "smsSettingsContainer");
      updateSectionState(whatsappEnabled.checked, "whatsappSettingsContainer");
    }

    notificationEnabled.addEventListener("change", refreshToggleStates);
    emailEnabled.addEventListener("change", refreshToggleStates);
    smsEnabled.addEventListener("change", refreshToggleStates);
    whatsappEnabled.addEventListener("change", refreshToggleStates);

    /*
     * ==========================================
     * COMMISSION DISPLAY
     * ==========================================
     */
    function refreshCommissionUI() {
      const type = commissionType.value;

      if (type === "PERCENTAGE") {
        commissionPrefix.textContent = "%";
        commissionValueLabel.textContent = "Commission Percentage";
        commissionValue.max = "100";
      } else {
        commissionPrefix.textContent = "₹";
        commissionValueLabel.textContent = "Fixed Commission";
        commissionValue.removeAttribute("max");
      }

      updateCommissionPreview();
    }

    function updateCommissionPreview() {
      const exampleFare = 10000;
      const value = Number(commissionValue.value || 0);

      let amount = 0;
      if (commissionType.value === "PERCENTAGE") {
        amount = exampleFare * (value / 100);
      } else {
        amount = value;
      }

      amount = Math.min(exampleFare, Math.max(0, amount));
      const driverEarning = exampleFare - amount;

      document.getElementById("commissionPreviewAmount").textContent = formatCurrency(amount);
      document.getElementById("commissionPreviewDriver").textContent = formatCurrency(driverEarning);
    }

    function formatCurrency(amount) {
      const currency = document.getElementById("settingCurrency").value || "INR";

      try {
        return new Intl.NumberFormat("en-IN", {style: "currency", currency}).format(Number(amount || 0));
      } catch {
        return `₹${Number(amount || 0).toFixed(2)}`;
      }
    }

    commissionType.addEventListener("change", refreshCommissionUI);
    commissionValue.addEventListener("input", updateCommissionPreview);
    document.getElementById("settingCurrency").addEventListener("change", updateCommissionPreview);

    /*
     * ==========================================
     * SAVE
     * ==========================================
     */
    async function saveSettings() {
      alertContainer.innerHTML = "";
      form.classList.add("was-validated");
      
      if (!form.checkValidity()) {
        return;
      }

      const commissionNumber = Number(commissionValue.value);
      if (commissionType.value === "PERCENTAGE" && (commissionNumber < 0 || commissionNumber > 100)) {
        showSettingsAlert("danger", "Percentage commission must be between 0 and 100.");
        return;
      }

      const payload = {
        general: {companyName: document.getElementById("settingCompanyName").value.trim(), currency: document.getElementById("settingCurrency").value},
        notifications: {
          enabled: notificationEnabled.checked, 
          bookingCreated: document.getElementById("notifyBookingCreated").checked, 
          driverAssigned: document.getElementById("notifyDriverAssigned").checked,
          bookingStatusChanged: document.getElementById("notifyBookingStatus").checked
        },
        email: {enabled: emailEnabled.checked, fromName: document.getElementById("emailFromName").value.trim(), fromEmail: document.getElementById("emailFromAddress").value.trim()},
        sms: {enabled: smsEnabled.checked, provider: document.getElementById("smsProvider").value},
        whatsapp: {enabled: whatsappEnabled.checked, provider: document.getElementById("whatsappProvider").value},
        driverCommission: {type: commissionType.value, value: commissionNumber, includeAllowances: document.getElementById("commissionIncludeAllowances").checked}
      };

      /*
       * Disable both save buttons.
       */
      const originalSubmit = submitBtn.innerHTML;
      const originalTop = saveAllBtn.innerHTML;
      submitBtn.disabled = true;
      saveAllBtn.disabled = true;

      submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Saving...`;
      saveAllBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Saving...`;

      try {
        await api("/admin/settings",{method: "PUT", body: JSON.stringify(payload)});
        showSettingsAlert("success", "Application settings saved successfully.");
        form.classList.remove("was-validated");
        window.scrollTo({top: 0, behavior: "smooth"});
      } catch (error) {
        showSettingsAlert("danger", error.message || "Unable to save application settings.");
      } finally {
        submitBtn.disabled = false;
        saveAllBtn.disabled = false;
        submitBtn.innerHTML = originalSubmit;
        saveAllBtn.innerHTML = originalTop;
      }
    }

    /*
     * Form submit
     */
    form.addEventListener("submit", async event => {
      event.preventDefault();
      await saveSettings();
    });

    /*
     * Header save button
     */
    saveAllBtn.addEventListener("click", async () => {
      await saveSettings();
    });

    /*
     * Reload settings
     */
    document.getElementById("reloadSettingsBtn").addEventListener("click", async () => {
      await applicationSettingsPage();
    });

    /*
     * ==========================================
     * ALERT
     * ==========================================
     */
    function showSettingsAlert(type, message) {
      alertContainer.innerHTML = `<div class="alert alert-${type} alert-dismissible fade show" role="alert">${type === "success" ? `<i class="bi bi-check-circle me-2"></i>` : `<i class="bi bi-exclamation-triangle me-2"></i>`} ${dcEscape(message)} <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" ></button></div>`;
    }

    /*
     * Initial rendering
     */
    refreshToggleStates();
    refreshCommissionUI();
  } catch (error) {
    page.innerHTML = `<div class="alert alert-danger"><h5><i class="bi bi-exclamation-triangle me-2"></i>Unable to load application settings</h5><div> ${dcEscape(error.message || "Unknown error")} </div></div>`;
  }
}

function showGlobalAlert(type = "info", message = "", options = {}) {
  const container = document.getElementById("globalAlert");
  if(!container) {
    console.warn("Global alert container #globalAlert was not found.");
    return;
  }
  const {
    autoClose = true,
      timeout = 5000,
      dismissible = true
  } = options;
  const allowedTypes = ["primary", "secondary", "success", "danger", "warning", "info", "light", "dark"];
  const alertType = allowedTypes.includes(type) ? type : "info";
  /*
   * Remove any previous alert.
   */
  container.innerHTML = "";
  /*
   * Create alert.
   */
  const alert = document.createElement("div");
  alert.className = `alert alert-${alertType} ` + `d-flex align-items-center ` + `shadow-sm`;
  alert.setAttribute("role", "alert");
  /*
   * Icon
   */
  const icon = document.createElement("i");
  icon.className = `${getGlobalAlertIcon(alertType)} me-2 fs-5`;
  alert.appendChild(icon);
  /*
   * Message
   *
   * textContent is deliberately used
   * instead of innerHTML to prevent XSS.
   */
  const messageElement = document.createElement("div");
  messageElement.className = "flex-grow-1";
  messageElement.textContent = message || "Something happened.";
  alert.appendChild(messageElement);
  /*
   * Close button
   */
  if(dismissible) {
    alert.classList.add("alert-dismissible");
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "btn-close";
    closeButton.setAttribute("aria-label", "Close");
    closeButton.addEventListener("click", () => {
      removeGlobalAlert(alert);
    });
    alert.appendChild(closeButton);
  }
  container.appendChild(alert);
  /*
   * Automatically scroll alert into view.
   */
  container.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
  /*
   * Auto close.
   */
  if(autoClose && timeout > 0) {
    window.setTimeout(
      () => {
        if(document.body.contains(alert)) {
          removeGlobalAlert(alert);
        }
      }, timeout);
  }
}

function getGlobalAlertIcon(type) {
  const icons = {
    success: "bi bi-check-circle-fill",
    danger: "bi bi-exclamation-triangle-fill",
    warning: "bi bi-exclamation-circle-fill",
    info: "bi bi-info-circle-fill",
    primary: "bi bi-info-circle-fill",
    secondary: "bi bi-info-circle-fill",
    light: "bi bi-info-circle-fill",
    dark: "bi bi-info-circle-fill"
  };
  return icons[type] || "bi bi-info-circle-fill";
}

function removeGlobalAlert(alert) {
  if(!alert) {
    return;
  }
  alert.remove();
}

// const changePasswordBtn = document.getElementById("changePasswordBtn");
// if (changePasswordBtn) {
//   changePasswordBtn.addEventListener("click", () => { changePasswordForm(); });
// }

function getDriverAvailabilityClass(availability) {
    const status = String(availability || "").toUpperCase();

    if (status === "AVAILABLE") return "bg-success";
    if (status === "BUSY") return "bg-warning text-dark";

    return "bg-secondary";
}