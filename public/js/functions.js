$(".itemInfo").on("click", displayItemInfo);

$("#cartIcon").on("click", displayCart);


async function displayCart(){
  
  let userId = $(this).attr("class");
  let url = `api/cartInfo?userId=${userId}`;
  let response = await fetch(url);
  let data = await response.json();

  console.log("TEST");
  
  // $("#cartBody").html(`<% for(var i = 0; i < ${data.length}; i++) {%> ${data[0].itemId} <br><br> <% } %>`);
  // $("#checkoutBtnSection").html(`<a href="/checkout"> Go To Checkout </a>`);

  // $("#ch")
  
};

async function displayItemInfo(){
  
  let itemId = $(this).attr("id");
  let url = `api/itemInfo?itemId=${itemId}`;
  let response = await fetch(url);
  let data = await response.json();

  let userId = $(this).attr("class");
  let str = userId.substring(9);
  url = `api/userInfo?userId=${str}`;
  response = await fetch(url);
  let users = await response.json();

  $(".itemTitle").html(`<label>${data[0].title}</label>`);
  $("#itemPrice").html(`<strong>$${data[0].price.toFixed(2)}</strong>`);
  $("#itemDesc").html(`${data[0].description}`);
  $("#itemImg").html(`<img src="${data[0].image}" width=250><br><br>`);
  $("#addtocartbtn").html(`<a href="/addToCart?itemId=${data[0].itemId}&userId=${users[0].userId}" id="cartButton" class="${users[0].userId}">Add to Cart</a>`);

}

function displayError(){
  $("#errorMessage").html("Error");
}

function alert(){
  alert("Username and Password do not match.");
}