defmodule CheckSplitterWeb.CheckLive do
  use CheckSplitterWeb, :live_view

  alias CheckSplitter.{CheckStore, Check}

  @impl true
  def mount(%{"id" => id}, _session, socket) do
    case CheckStore.get_check(id) do
      {:ok, check} ->
        # Subscribe to updates
        CheckStore.subscribe(id)

        # Get or set participant ID from session
        participant_id = get_participant_id(socket, check)

        socket =
          socket
          |> assign(:check, check)
          |> assign(:participant_id, participant_id)
          |> assign(:show_tip_modal, false)
          |> assign(:tip_input, "")

        {:ok, socket}

      {:error, :not_found} ->
        {:ok, socket |> put_flash(:error, "Check not found") |> push_navigate(to: ~p"/")}
    end
  end

  @impl true
  def handle_info({:check_updated, check_id}, socket) do
    # Reload check when it's updated by someone else
    case CheckStore.get_check(check_id) do
      {:ok, check} ->
        {:noreply, assign(socket, :check, check)}

      _ ->
        {:noreply, socket}
    end
  end

  @impl true
  def handle_event("toggle_claim", %{"item_id" => item_id}, socket) do
    check = socket.assigns.check
    participant_id = socket.assigns.participant_id

    # Check if already claimed by this participant
    item = Enum.find(check.items, &(&1.id == item_id))

    check =
      if participant_id in item.claimed_by do
        Check.unclaim_item(check, item_id, participant_id)
      else
        Check.claim_item(check, item_id, participant_id)
      end

    {:ok, check} = CheckStore.update_check(check)
    {:noreply, assign(socket, :check, check)}
  end

  @impl true
  def handle_event("show_tip_modal", _params, socket) do
    {:noreply, assign(socket, show_tip_modal: true, tip_input: "")}
  end

  @impl true
  def handle_event("hide_tip_modal", _params, socket) do
    {:noreply, assign(socket, :show_tip_modal, false)}
  end

  @impl true
  def handle_event("validate_tip", %{"tip" => tip}, socket) do
    {:noreply, assign(socket, :tip_input, tip)}
  end

  @impl true
  def handle_event("set_tip", %{"tip" => tip}, socket) do
    check = socket.assigns.check

    check =
      case Float.parse(tip) do
        {amount, _} when amount >= 0 ->
          Check.set_tip(check, amount)

        _ ->
          check
      end

    {:ok, check} = CheckStore.update_check(check)

    socket =
      socket
      |> assign(:check, check)
      |> assign(:show_tip_modal, false)

    {:noreply, socket}
  end

  @impl true
  def handle_event("copy_share_code", _params, socket) do
    {:noreply, put_flash(socket, :info, "Share code copied!")}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="check-view">
      <div class="check-header">
        <h2>Check Details</h2>

        <div class="share-code-box">
          <label>Share Code:</label>
          <div class="share-code">
            <code><%= @check.share_code %></code>
            <button
              phx-click="copy_share_code"
              onclick={"navigator.clipboard.writeText('#{@check.share_code}')"}
              class="btn-copy"
            >
              📋 Copy
            </button>
          </div>
          <small>Share this code with others to split the bill</small>
        </div>
      </div>

      <div class="participants">
        <h3>Participants (<%= map_size(@check.participants) %>)</h3>
        <div class="participant-list">
          <%= for {_id, name} <- @check.participants do %>
            <span class="participant-badge"><%= name %></span>
          <% end %>
        </div>
      </div>

      <div class="items-section">
        <div class="section-header">
          <h3>Items</h3>
          <.button phx-click="show_tip_modal" class="btn-secondary btn-sm">
            Set Tip ($<%= Decimal.to_string(@check.tip_amount, :normal) %>)
          </.button>
        </div>

        <div class="items-grid">
          <%= for item <- @check.items do %>
            <div
              class={[
                "item-card",
                if(@participant_id in item.claimed_by, do: "claimed-by-me", else: ""),
                if(length(item.claimed_by) > 0, do: "claimed", else: "unclaimed")
              ]}
              phx-click="toggle_claim"
              phx-value-item_id={item.id}
            >
              <div class="item-content">
                <div class="item-description">
                  <%= item.description %>
                </div>
                <div class="item-price">
                  $<%= Decimal.to_string(item.price, :normal) %>
                </div>
              </div>

              <%= if length(item.claimed_by) > 0 do %>
                <div class="claimed-info">
                  <small>
                    Claimed by:
                    <%= item.claimed_by
                    |> Enum.map(&Map.get(@check.participants, &1, "Unknown"))
                    |> Enum.join(", ") %>
                  </small>
                  <%= if length(item.claimed_by) > 1 do %>
                    <small class="split-info">
                      Split <%= length(item.claimed_by) %> ways
                    </small>
                  <% end %>
                </div>
              <% else %>
                <div class="unclaimed-info">
                  <small>Tap to claim</small>
                </div>
              <% end %>
            </div>
          <% end %>
        </div>
      </div>

      <div class="breakdown-section">
        <h3>Bill Breakdown</h3>

        <% totals = Check.calculate_totals(@check) %>

        <div class="breakdown-list">
          <%= for {participant_id, breakdown} <- totals do %>
            <div class={[
              "breakdown-item",
              if(participant_id == @participant_id, do: "current-user", else: "")
            ]}>
              <div class="breakdown-name">
                <%= breakdown.name %>
                <%= if participant_id == @participant_id do %>
                  <span class="you-badge">(You)</span>
                <% end %>
              </div>
              <div class="breakdown-amounts">
                <div class="amount-row">
                  <span>Items:</span>
                  <span>$<%= Decimal.to_string(breakdown.subtotal, :normal) %></span>
                </div>
                <div class="amount-row">
                  <span>Tip:</span>
                  <span>$<%= Decimal.to_string(breakdown.tip, :normal) %></span>
                </div>
                <div class="amount-row total">
                  <strong>Total:</strong>
                  <strong>$<%= Decimal.to_string(breakdown.total, :normal) %></strong>
                </div>
              </div>
            </div>
          <% end %>
        </div>

        <div class="grand-total">
          <div class="grand-total-row">
            <span>Grand Total (with tip):</span>
            <strong>
              $<%= totals
              |> Enum.map(fn {_, b} -> b.total end)
              |> Enum.reduce(Decimal.new(0), &Decimal.add/2)
              |> Decimal.to_string(:normal) %>
            </strong>
          </div>
        </div>
      </div>

      <%= if @show_tip_modal do %>
        <div class="modal-overlay" phx-click="hide_tip_modal">
          <div class="modal" phx-click={JS.stop_propagation()}>
            <h3>Set Tip Amount</h3>

            <form phx-submit="set_tip">
              <.input
                for="tip"
                label="Tip Amount ($)"
                type="number"
                step="0.01"
                min="0"
                value={@tip_input}
                phx-change="validate_tip"
                placeholder="0.00"
              />

              <div class="modal-actions">
                <.button type="submit" class="btn-primary">Set Tip</.button>
                <.button type="button" phx-click="hide_tip_modal" class="btn-secondary">
                  Cancel
                </.button>
              </div>
            </form>
          </div>
        </div>
      <% end %>
    </div>
    """
  end

  # Helper to get or create participant ID for this socket session
  defp get_participant_id(socket, check) do
    # In a real app, you'd store this in the session
    # For now, use the first participant (owner)
    check.participants |> Map.keys() |> List.first()
  end
end
