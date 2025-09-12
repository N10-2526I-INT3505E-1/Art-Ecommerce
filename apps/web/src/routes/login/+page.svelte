<script lang="ts">
  let email = '';
  let password = '';

  function handleSubmit() {
    // Handle login logic here
    console.log({ email, password });
  }
</script>

<div class="hero bg-base-200 min-h-screen">
  <div class="hero-content flex-col lg:flex-row-reverse">
    <div class="text-center lg:text-left">
      <p class="py-6">
      </p>
    </div>
    <fieldset class="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4 ">
      <legend class="fieldset-legend text-2xl">Login</legend>
<div class="flex flex-col gap-3">
<div>
      <label class="label font-bold">Email</label>
      <input type="email" class="input" placeholder="Email" />
</div>
<div>
      <label class="label font-bold">Password</label>
      <input type="password" class="input" placeholder="Password" />
</div>
</div>
      <button class="btn btn-neutral mt-4">Login</button>
    </fieldset>
  </div>
</div>
