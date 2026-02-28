const supabaseUrl = "https://nuvnryefvjueblxhfhwv.supabase.co";
const supabaseKey = "sb_publishable_C_wmngcZd4HD2F9jLRANfA__IkA-dNK";

const client = window.supabase.createClient(supabaseUrl, supabaseKey);

async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await client.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    alert("Login Failed");
  } else {
    alert("Login Success");
    window.location.href = "home.html";
  }
}
async function logout() {
  await client.auth.signOut();
  window.location.href = "index.html";
}
let lat, lng;

function getLocation() {
  navigator.geolocation.getCurrentPosition((position) => {
    lat = position.coords.latitude;
    lng = position.coords.longitude;

    document.getElementById("locationText").innerText =
      "Latitude: " + lat + " | Longitude: " + lng;
  });
}

async function submitComplaint() {
  const file = document.getElementById("image").files[0];

  if (!file) {
    alert("Please select an image");
    return;
  }

  // Upload image to Supabase Storage
  const { data: uploadData, error: uploadError } =
    await client.storage
      .from('complaints')
      .upload(`public/${Date.now()}-${file.name}`, file);

  if (uploadError) {
    alert("Image upload failed");
    return;
  }

  // Save complaint data
  const { error } = await client
    .from("complaints")
    .insert([
      {
        image_url: uploadData.path,
        latitude: lat,
        longitude: lng,
        status: "Pending"
      }
    ]);

  if (error) {
    alert("Error saving complaint");
  } else {
    alert("Complaint Submitted Successfully");
  }
}