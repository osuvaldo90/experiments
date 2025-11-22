defmodule CheckSplitterWeb.JoinLive do
  use CheckSplitterWeb, :live_view

  alias CheckSplitter.CheckStore

  @impl true
  def mount(params, _session, socket) do
    share_code = Map.get(params, "share_code", "")

    socket =
      socket
      |> assign(:share_code, share_code)
      |> assign(:participant_name, "")
      |> assign(:error, nil)

    {:ok, socket}
  end

  @impl true
  def handle_event("validate_share_code", %{"share_code" => code}, socket) do
    {:noreply, assign(socket, share_code: String.upcase(code), error: nil)}
  end

  @impl true
  def handle_event("validate_name", %{"participant_name" => name}, socket) do
    {:noreply, assign(socket, :participant_name, name)}
  end

  @impl true
  def handle_event("join_check", _params, socket) do
    share_code = socket.assigns.share_code
    name = socket.assigns.participant_name

    if share_code != "" and name != "" do
      case CheckStore.get_check_by_share_code(share_code) do
        {:ok, check} ->
          # Add participant to check
          check = CheckSplitter.Check.add_participant(check, name)
          {:ok, _check} = CheckStore.update_check(check)

          {:noreply, push_navigate(socket, to: ~p"/check/#{check.id}")}

        {:error, :not_found} ->
          {:noreply, assign(socket, :error, "Check not found. Please verify the share code.")}
      end
    else
      {:noreply, assign(socket, :error, "Please enter both share code and your name")}
    end
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="join-check">
      <h2>Join a Check</h2>

      <form phx-submit="join_check">
        <.input
          for="share_code"
          label="Share Code"
          value={@share_code}
          phx-change="validate_share_code"
          placeholder="Enter 6-character code"
          maxlength="6"
        />

        <.input
          for="participant_name"
          label="Your Name"
          value={@participant_name}
          phx-change="validate_name"
          placeholder="Enter your name"
        />

        <%= if @error do %>
          <div class="error-message">
            <%= @error %>
          </div>
        <% end %>

        <.button type="submit" class="btn-primary btn-lg">Join Check</.button>
      </form>

      <div class="back-link">
        <a href={~p"/"}>← Back to Home</a>
      </div>
    </div>
    """
  end
end
