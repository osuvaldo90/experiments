defmodule CheckSplitterWeb.HomeLive do
  use CheckSplitterWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    {:ok, socket}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="home">
      <div class="hero">
        <h1>Split Your Bill Easily</h1>
        <p>Upload a receipt or enter items manually, then share with friends to split the cost.</p>

        <div class="actions">
          <.button phx-click={JS.navigate(~p"/new")} class="btn-primary btn-lg">
            Start New Check
          </.button>

          <.button phx-click={JS.navigate(~p"/join")} class="btn-secondary btn-lg">
            Join Existing Check
          </.button>
        </div>
      </div>

      <div class="features">
        <div class="feature">
          <h3>📸 Photo or Manual Entry</h3>
          <p>Upload a receipt photo with OCR parsing, or enter items manually</p>
        </div>

        <div class="feature">
          <h3>🔗 Easy Sharing</h3>
          <p>Get a share code to invite others to split the bill</p>
        </div>

        <div class="feature">
          <h3>✅ Claim Items</h3>
          <p>Tap items to claim them. Split items between multiple people automatically</p>
        </div>

        <div class="feature">
          <h3>💵 Auto Calculate</h3>
          <p>See exactly what everyone owes, including their share of the tip</p>
        </div>
      </div>
    </div>
    """
  end
end
