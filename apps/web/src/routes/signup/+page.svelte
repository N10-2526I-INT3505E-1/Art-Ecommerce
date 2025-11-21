<script lang="ts">
let name = "";
let email = "";
let password = "";
let confirmPassword = "";

function handleSubmit() {
	if (password !== confirmPassword) {
		alert("Passwords do not match!");
		return;
	}
	// Handle signup logic here
	console.log({ name, email, password });
}
</script>

<div class="hero bg-base-200 min-h-screen">
  <div class="hero-content flex-col lg:flex-row-reverse">
    <div class="text-center lg:text-left">
      <h1 class="text-5xl font-bold">Sign up now!</h1>
      <p class="py-6">
        Join our community of art lovers and discover unique pieces from talented artists around the world.
      </p>
    </div>
    <div class="card bg-base-100 w-full max-w-sm shrink-0 shadow-2xl">
      <form class="card-body" on:submit|preventDefault={handleSubmit}>
        <div class="form-control">
          <label class="label" for="name">
            <span class="label-text">Name</span>
          </label>
          <input type="text" id="name" placeholder="name" class="input input-bordered" required bind:value={name} />
        </div>
        <div class="form-control">
          <label class="label" for="email">
            <span class="label-text">Email</span>
          </label>
          <input type="email" id="email" placeholder="email" class="input input-bordered" required bind:value={email} />
        </div>
        <div class="form-control">
          <label class="label" for="password">
            <span class="label-text">Password</span>
          </label>
          <input type="password" id="password" placeholder="password" class="input input-bordered" required bind:value={password} />
        </div>
        <div class="form-control">
          <label class="label" for="confirm-password">
            <span class="label-text">Confirm Password</span>
          </label>
          <input type="password" id="confirm-password" placeholder="confirm password" class="input input-bordered" required bind:value={confirmPassword} />
        </div>
        <div class="form-control mt-6">
          <button class="btn btn-primary">Sign Up</button>
        </div>
        <div class="text-center mt-4">
          <p>
            Already have an account?
            <a href="/login" class="link link-primary">Log in</a>
          </p>
        </div>
      </form>
    </div>
  </div>
</div>
