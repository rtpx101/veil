(function () {
  try {
    var params = new URLSearchParams(location.search);
    if (params.get("worker")) {
      localStorage.setItem("veil_worker_url", params.get("worker").replace(/\/$/, ""));
    }
  } catch (err) {}
  var workerUrl = (localStorage.getItem("veil_worker_url") || "https://veil-access.retropixel404.workers.dev").replace(/\/$/, "");
  var adminSession = "veil_admin_session";
  var sessionToken = "";
  try {
    sessionToken = sessionStorage.getItem(adminSession) || "";
  } catch (err) {}
  var users = [];
  var statusFilter = "all";
  function byId(value) {
    return document.getElementById(value);
  }
  function escapeHTML(value2) {
    return String(value2 == null ? "" : value2).replace(/[&<>"]/g, function (value) {
      if (value === "&") {
        return "&amp;";
      }
      if (value === "<") {
        return "&lt;";
      }
      if (value === ">") {
        return "&gt;";
      }
      return "&quot;";
    });
  }
  function toast(value, extra) {
    var count = byId("toast");
    if (!count) {
      return;
    }
    count.textContent = value || "";
    count.className = "toast show" + (extra === true ? " ok" : extra === false ? " err" : "");
    clearTimeout(count._t);
    count._t = setTimeout(function () {
      count.className = "toast";
    }, 2600);
  }
  function api(value3, extra) {
    extra = extra || {};
    var meta = {
      "content-type": "application/json"
    };
    if (sessionToken) {
      meta["x-veil-admin"] = sessionToken;
    }
    return fetch(workerUrl + value3, {
      method: extra.method || "GET",
      headers: meta,
      body: extra.body
    }).then(function (value2) {
      return value2.json().catch(function () {
        return {};
      }).then(function (value) {
        return {
          res: value2,
          data: value
        };
      });
    }).catch(function () {
      return {
        res: {
          ok: false,
          status: 0
        },
        data: {
          ok: false,
          error: "Could not reach the server"
        }
      };
    });
  }
  function confirmModal(value3, extra) {
    return new Promise(function (value2) {
      var name2 = document.createElement("div");
      name2.className = "modal";
      name2.innerHTML = "<div class=\"modal-card\"><h3>" + escapeHTML(value3) + "</h3><p>" + escapeHTML(extra) + "</p><div class=\"modal-actions\"><button type=\"button\" data-no>Cancel</button><button type=\"button\" class=\"danger\" data-yes>Confirm</button></div></div>";
      document.body.appendChild(name2);
      requestAnimationFrame(function () {
        name2.classList.add("open");
      });
      function closeModal(value) {
        name2.classList.remove("open");
        setTimeout(function () {
          name2.remove();
          value2(value);
        }, 180);
      }
      name2.querySelector("[data-no]").onclick = function () {
        closeModal(false);
      };
      name2.querySelector("[data-yes]").onclick = function () {
        closeModal(true);
      };
      name2.addEventListener("click", function (value) {
        if (value.target === name2) {
          closeModal(false);
        }
      });
    });
  }
  function showApp(value) {
    byId("loginView").classList.toggle("show", !value);
    byId("appView").classList.toggle("show", value);
    if (!value) {
      try {
        sessionStorage.removeItem(adminSession);
      } catch (err) {}
      sessionToken = "";
    }
  }
  function formatWhen(value) {
    if (!value) {
      return "Never";
    }
    try {
      return new Date(value).toLocaleString();
    } catch (err) {
      return "Never";
    }
  }
  function userStatus(value) {
    if (value.banned || value.status === "banned") {
      return "banned";
    }
    if (value.status === "unverified" || value.emailVerified === false) {
      return "unverified";
    }
    if (value.status === "expired") {
      return "expired";
    }
    if (value.status === "allowed" || value.infinite || value.hasAccess) {
      return value.status || "allowed";
    }
    if (value.status) {
      return value.status;
    }
    return "pending";
  }
  function statusLine(value) {
    var title = userStatus(value);
    if (title === "banned") {
      return "Banned" + (value.banRemainingHuman ? " · " + value.banRemainingHuman : "") + (value.banReason ? " · " + value.banReason : "");
    }
    if (title === "unverified") {
      return "Email not confirmed";
    }
    if (value.infinite || value.remainingLabel === "inf") {
      return "Access does not expire";
    }
    if (title === "allowed") {
      return "Access left: " + (value.remainingHuman || value.remainingLabel || "active");
    }
    if (title === "expired") {
      return "Access expired";
    }
    return "Waiting for access";
  }
  function updateCounts() {
    var color = {
      all: users.length,
      pending: 0,
      allowed: 0,
      banned: 0,
      unverified: 0,
      expired: 0
    };
    users.forEach(function (value) {
      var id = userStatus(value);
      if (color[id] != null) {
        color[id] += 1;
      }
    });
    ["all", "pending", "allowed", "expired", "banned", "unverified"].forEach(function (value) {
      var el = document.querySelector("[data-count=\"" + value + "\"]");
      if (el) {
        el.textContent = String(value === "all" ? color.all : color[value] || 0);
      }
    });
  }
  function filteredUsers() {
    var hex = (byId("userSearch").value || "").trim().toLowerCase();
    return users.filter(function (value) {
      var err = userStatus(value);
      if (statusFilter !== "all" && err !== statusFilter) {
        return false;
      }
      if (!hex) {
        return true;
      }
      return String(value.email || "").toLowerCase().indexOf(hex) !== -1;
    });
  }
  function postUser(value2, extra, other, detail) {
    var child = Object.assign({
      email: extra
    }, other || {});
    return api(value2, {
      method: "POST",
      body: JSON.stringify(child)
    }).then(function (value) {
      toast(value.data.ok ? detail : value.data.error || "That did not work", !!value.data.ok);
      if (value.data.ok) {
        return loadUsers();
      }
    });
  }
  function renderUsers() {
    updateCounts();
    var label = byId("userList");
    var record = filteredUsers();
    label.innerHTML = "";
    if (!record.length) {
      label.innerHTML = "<div class=\"empty\">No accounts match this view.</div>";
      return;
    }
    record.forEach(function (value2) {
      var text = userStatus(value2);
      var raw = document.createElement("article");
      raw.className = "user";
      raw.innerHTML = "<button type=\"button\" class=\"user-main\"><div class=\"user-top\"><span class=\"user-email\">" + escapeHTML(value2.email) + "</span><span class=\"badge " + escapeHTML(text) + "\">" + escapeHTML(text) + "</span></div><div class=\"user-meta\">" + escapeHTML(statusLine(value2)) + "</div></button><div class=\"detail\"><div class=\"meta-grid\"><div><span>Joined</span><b>" + escapeHTML(formatWhen(value2.created)) + "</b></div><div><span>Last login</span><b>" + escapeHTML(formatWhen(value2.lastLogin)) + "</b></div><div><span>Expires</span><b>" + escapeHTML(value2.infinite ? "Never" : formatWhen(value2.expires)) + "</b></div><div><span>Password</span><b>" + (value2.hasPassword ? "Set" : "None") + "</b></div></div><label>Give access</label><div class=\"row\"><input class=\"dur\" value=\"1d\" placeholder=\"1d, 2h, 30m, inf\"><select class=\"mode\"><option value=\"set\">Replace</option><option value=\"add\">Add on</option></select><button type=\"button\" class=\"primary grant\">Give time</button></div><label>Ban</label><div class=\"row\"><input class=\"bandur\" value=\"1d\" placeholder=\"How long\"><input class=\"banreason\" placeholder=\"Reason, optional\"><button type=\"button\" class=\"danger ban\">Ban</button></div><label>New password</label><input class=\"newpass\" type=\"text\" placeholder=\"At least 4 characters\"><button type=\"button\" class=\"setpass\">Save password</button><div class=\"row actions\"><button type=\"button\" class=\"chatadmin\">Chat admin</button><button type=\"button\" class=\"kick\">End access</button>" + (text === "banned" ? "<button type=\"button\" class=\"unban\">Remove ban</button>" : "") + (value2.emailVerified ? "<button type=\"button\" class=\"deverify\">De-verify</button>" : "<button type=\"button\" class=\"verify\">Mark verified</button><button type=\"button\" class=\"sendverify\">Send code</button>") + "<button type=\"button\" class=\"danger delacc\">Delete</button></div></div>";
      raw.querySelector(".user-main").onclick = function () {
        raw.classList.toggle("open");
      };
      raw.querySelector(".grant").onclick = function () {
        postUser("/api/admin/users/grant", value2.email, {
          duration: raw.querySelector(".dur").value,
          mode: raw.querySelector(".mode").value
        }, "Access updated");
      };
      raw.querySelector(".ban").onclick = function () {
        var inf = raw.querySelector(".bandur").value || "inf";
        confirmModal("Ban this account?", value2.email + " will be blocked for " + inf + ".").then(function (value) {
          if (!value) {
            return;
          }
          postUser("/api/admin/users/ban", value2.email, {
            duration: inf,
            reason: raw.querySelector(".banreason").value || ""
          }, "Account banned");
        });
      };
      raw.querySelector(".setpass").onclick = function () {
        var clientId = raw.querySelector(".newpass").value || "";
        if (clientId.length < 4) {
          toast("Password must be at least 4 characters.", false);
          return;
        }
        postUser("/api/admin/users/set-password", value2.email, {
          password: clientId
        }, "Password saved");
      };
      var chatadmin = raw.querySelector(".chatadmin");
      if (chatadmin) {
        var next = [];
        try {
          next = JSON.parse(localStorage.getItem("veil_chat_admins") || "[]");
        } catch (err) {}
        if (!Array.isArray(next)) {
          next = [];
        }
        var prev = String(value2.email || "").toLowerCase();
        next = next.map(function (value) {
          return String(value || "").toLowerCase();
        });
        if (next.indexOf(prev) !== -1) {
          chatadmin.textContent = "Remove chat admin";
        }
        chatadmin.onclick = function () {
          var force = [];
          try {
            force = JSON.parse(localStorage.getItem("veil_chat_admins") || "[]");
          } catch (err) {}
          if (!Array.isArray(force)) {
            force = [];
          }
          force = force.map(function (value) {
            return String(value || "").toLowerCase();
          }).filter(Boolean);
          if (force.indexOf(prev) === -1) {
            force.push(prev);
          } else {
            force = force.filter(function (value) {
              return value !== prev;
            });
          }
          try {
            localStorage.setItem("veil_chat_admins", JSON.stringify(force));
          } catch (err) {}
          toast(force.indexOf(prev) !== -1 ? "Chat admin on" : "Chat admin off", true);
          renderUsers();
        };
      }
      raw.querySelector(".kick").onclick = function () {
        confirmModal("End access?", value2.email + " will be signed out and sent back to the waiting page.").then(function (value) {
          if (value) {
            postUser("/api/admin/users/invalidate", value2.email, {}, "Access ended");
          }
        });
      };
      var unban = raw.querySelector(".unban");
      if (unban) {
        unban.onclick = function () {
          postUser("/api/admin/users/unban", value2.email, {}, "Ban removed");
        };
      }
      var verify = raw.querySelector(".verify");
      if (verify) {
        verify.onclick = function () {
          postUser("/api/admin/users/verify", value2.email, {}, "Marked verified");
        };
      }
      var deverify = raw.querySelector(".deverify");
      if (deverify) {
        deverify.onclick = function () {
          confirmModal("De-verify email?", value2.email + " must enter a new code before they can wait for access.").then(function (value) {
            if (value) {
              postUser("/api/admin/users/deverify", value2.email, {}, "Email must be confirmed again");
            }
          });
        };
      }
      var sendverify = raw.querySelector(".sendverify");
      if (sendverify) {
        sendverify.onclick = function () {
          postUser("/api/admin/users/send-verify", value2.email, {}, "Verification code sent");
        };
      }
      raw.querySelector(".delacc").onclick = function () {
        confirmModal("Delete this account?", "This removes " + value2.email + " completely. They must sign up and confirm email again.").then(function (value) {
          if (value) {
            postUser("/api/admin/users/delete", value2.email, {}, "Account deleted");
          }
        });
      };
      label.appendChild(raw);
    });
  }
  function loadUsers() {
    var result = (byId("userSearch").value || "").trim();
    return api("/api/admin/users" + (result ? "?q=" + encodeURIComponent(result) : "")).then(function (value) {
      if (!value.data.ok) {
        if (value.res && (value.res.status === 401 || value.res.status === 403)) {
          showApp(false);
        }
        toast(value.data.error || "Could not load accounts", false);
        return;
      }
      users = value.data.users || [];
      renderUsers();
    });
  }
  byId("loginBtn").onclick = function () {
    var opts = byId("adminPass").value || "";
    if (!opts) {
      toast("Enter the admin password.", false);
      return;
    }
    byId("loginBtn").disabled = true;
    api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        password: opts
      })
    }).then(function (value) {
      byId("loginBtn").disabled = false;
      byId("adminPass").value = "";
      if (!value.data.ok || !value.data.token) {
        toast(value.data.error || "Wrong password", false);
        return;
      }
      sessionToken = value.data.token;
      try {
        sessionStorage.setItem(adminSession, sessionToken);
      } catch (err) {}
      showApp(true);
      loadUsers();
    });
  };
  byId("adminPass").addEventListener("keydown", function (value) {
    if (value.key === "Enter") {
      byId("loginBtn").click();
    }
  });
  byId("signOutBtn").onclick = function () {
    showApp(false);
    toast("Signed out");
  };
  byId("refreshUsers").onclick = function () {
    loadUsers();
  };
  byId("signoutAll").onclick = function () {
    confirmModal("Sign everyone out?", "Every open session will be ended. Accounts are not deleted.").then(function (value2) {
      if (!value2) {
        return;
      }
      api("/api/admin/signout-all", {
        method: "POST",
        body: "{}"
      }).then(function (value) {
        toast(value.data.ok ? "Everyone was signed out" : value.data.error || "Failed", !!value.data.ok);
      });
    });
  };
  var fresh = null;
  byId("userSearch").addEventListener("input", function () {
    clearTimeout(fresh);
    fresh = setTimeout(function () {
      if (sessionToken) {
        loadUsers();
      } else {
        renderUsers();
      }
    }, 220);
  });
  document.querySelectorAll("[data-filter]").forEach(function (value2) {
    value2.onclick = function () {
      statusFilter = value2.getAttribute("data-filter");
      document.querySelectorAll("[data-filter]").forEach(function (value) {
        value.classList.toggle("on", value === value2);
      });
      renderUsers();
    };
  });
  if (sessionToken) {
    showApp(true);
    loadUsers();
  }
})();
