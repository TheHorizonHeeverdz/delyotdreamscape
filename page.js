let username = String(localStorage.getItem("delyotds_username"))

if (username == "null") {
      username = prompt("enter your username, will be saved locally", "")
      if (username == null || username == "") {
            text = "User refused to tell";
            username = "player 1"
            document.getElementById("player").textContent = username;
      } else {
            localStorage.setItem("delyotds_username",String(username))
      }
      document.getElementById("player").textContent = username;

} else {
      document.getElementById("player").textContent = username;
}