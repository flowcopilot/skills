export async function getAccount() {
  const response = await fetch("https://api.example.test/account");
  return response.json();
}
