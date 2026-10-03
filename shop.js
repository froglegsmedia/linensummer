(function () {
  var TICKET_KEY = "linensummer.ticket";
  var ORDER_KEY = "linensummer.order";

  var PRODUCT = {
    id: "the-summer-shirt",
    name: "The Summer Shirt",
    color: "Natural",
    cloth: "Undyed linen",
    price: 148
  };

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var data = JSON.parse(raw);
      return data == null ? fallback : data;
    } catch (err) {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function ticket() {
    var data = read(TICKET_KEY, null);
    if (!data || !Array.isArray(data.items)) return { items: [] };
    return data;
  }

  function money(n) {
    return "$" + n;
  }

  function lineTotal(item) {
    return item.price * item.qty;
  }

  function sum(items) {
    var n = 0;
    for (var i = 0; i < items.length; i++) n += lineTotal(items[i]);
    return n;
  }

  function whenPT(iso) {
    try {
      return new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        dateStyle: "medium",
        timeStyle: "short"
      }) + " PT";
    } catch (err) {
      return iso;
    }
  }

  var orderForm = document.getElementById("order-form");
  if (orderForm) {
    orderForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var note = document.getElementById("form-note");
      var sizeEl = orderForm.querySelector("input[name=size]:checked");
      var qtyEl = document.getElementById("qty");
      if (!sizeEl) {
        note.textContent = "Pick a size.";
        var first = orderForm.querySelector("input[name=size]");
        if (first) first.focus();
        return;
      }
      var qty = parseInt(qtyEl.value, 10);
      if (!qty || qty < 1) qty = 1;
      if (qty > 6) qty = 6;
      var data = ticket();
      var found = null;
      for (var i = 0; i < data.items.length; i++) {
        if (data.items[i].size === sizeEl.value) found = data.items[i];
      }
      if (found) {
        found.qty += qty;
        if (found.qty > 6) found.qty = 6;
      } else {
        data.items.push({
          id: PRODUCT.id,
          name: PRODUCT.name,
          color: PRODUCT.color,
          cloth: PRODUCT.cloth,
          price: PRODUCT.price,
          size: sizeEl.value,
          qty: qty
        });
      }
      write(TICKET_KEY, data);
      window.location.href = "checkout.html";
    });

    var reach = document.querySelector(".reach");
    var order = document.getElementById("order");
    if (reach && order && "IntersectionObserver" in window) {
      var watcher = new IntersectionObserver(function (entries) {
        reach.classList.toggle("is-on", !entries[0].isIntersecting);
        reach.hidden = !!entries[0].isIntersecting;
      }, { threshold: 0.2 });
      watcher.observe(order);
    }
  }

  var summary = document.getElementById("summary");
  if (!summary) return;

  var linesEl = document.getElementById("lines");
  var totalEl = document.getElementById("total");
  var emptyEl = document.getElementById("empty");
  var payForm = document.getElementById("pay-form");
  var clearBtn = document.getElementById("clear-ticket");
  var savedEl = document.getElementById("saved");

  function renderTicket() {
    var data = ticket();
    linesEl.textContent = "";
    if (!data.items.length) {
      emptyEl.hidden = false;
      payForm.hidden = true;
      totalEl.hidden = true;
      clearBtn.hidden = true;
      return;
    }
    emptyEl.hidden = true;
    payForm.hidden = false;
    totalEl.hidden = false;
    clearBtn.hidden = false;
    for (var i = 0; i < data.items.length; i++) {
      (function (item, index) {
        var li = document.createElement("li");
        var what = document.createElement("p");
        what.className = "what";
        what.textContent = item.name;
        var meta = document.createElement("p");
        meta.className = "meta";
        meta.textContent = item.color + " " + item.cloth.toLowerCase() + " · size " + item.size + " · qty " + item.qty;
        var amt = document.createElement("p");
        amt.className = "amt";
        amt.textContent = money(lineTotal(item));
        var remove = document.createElement("button");
        remove.type = "button";
        remove.className = "quiet";
        remove.textContent = "Remove";
        remove.addEventListener("click", function () {
          var current = ticket();
          current.items.splice(index, 1);
          write(TICKET_KEY, current);
          renderTicket();
        });
        var left = document.createElement("div");
        left.appendChild(what);
        left.appendChild(meta);
        left.appendChild(remove);
        li.appendChild(left);
        li.appendChild(amt);
        linesEl.appendChild(li);
      })(data.items[i], i);
    }
    totalEl.textContent = "";
    var label = document.createElement("span");
    label.textContent = "Total";
    var num = document.createElement("span");
    num.textContent = money(sum(data.items));
    totalEl.appendChild(label);
    totalEl.appendChild(num);
  }

  function row(dl, term, value) {
    var wrap = document.createElement("div");
    var dt = document.createElement("dt");
    dt.textContent = term;
    var dd = document.createElement("dd");
    dd.textContent = value;
    wrap.appendChild(dt);
    wrap.appendChild(dd);
    dl.appendChild(wrap);
  }

  function renderSaved(order) {
    savedEl.textContent = "";
    if (!order) {
      savedEl.hidden = true;
      return;
    }
    savedEl.hidden = false;
    var h = document.createElement("h2");
    h.textContent = "Saved on this device";
    var lead = document.createElement("p");
    lead.textContent = "Payment is not live yet. Nothing was charged. This copy stays in this browser only.";
    var dl = document.createElement("dl");
    dl.className = "receipt";
    row(dl, "Ticket", order.ticketNo || "—");
    row(dl, "Saved", whenPT(order.savedAt));
    row(dl, "Name", order.name);
    row(dl, "Email", order.email);
    row(dl, "City", order.city);
    var itemText = order.items.map(function (item) {
      return item.name + ", " + item.color.toLowerCase() + ", size " + item.size + ", qty " + item.qty + " (" + money(item.price * item.qty) + ")";
    }).join("; ");
    row(dl, "Order", itemText);
    row(dl, "Total", money(order.total) + " sample");
    row(dl, "Payment", "Not live");
    savedEl.appendChild(h);
    savedEl.appendChild(lead);
    savedEl.appendChild(dl);
  }

  renderTicket();
  renderSaved(read(ORDER_KEY, null));

  clearBtn.addEventListener("click", function () {
    write(TICKET_KEY, { items: [] });
    renderTicket();
  });

  payForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var data = ticket();
    if (!data.items.length) return;
    var name = payForm.name.value.trim();
    var email = payForm.email.value.trim();
    var city = payForm.city.value.trim();
    if (!name || !email || !city) return;
    var stamp = Date.now().toString(36).toUpperCase();
    var order = {
      ticketNo: "LS-" + stamp.slice(-4),
      savedAt: new Date().toISOString(),
      name: name,
      email: email,
      city: city,
      items: data.items.map(function (item) {
        return {
          id: item.id,
          name: item.name,
          color: item.color,
          cloth: item.cloth,
          price: item.price,
          size: item.size,
          qty: item.qty
        };
      }),
      total: sum(data.items),
      payment: "not-live",
      charged: false
    };
    write(ORDER_KEY, order);
    renderSaved(order);
    savedEl.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
