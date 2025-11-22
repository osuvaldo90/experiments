defmodule CheckSplitterWeb.NewCheckLive do
  use CheckSplitterWeb, :live_view

  alias CheckSplitter.{CheckStore, OCR, LineItem}

  @impl true
  def mount(_params, _session, socket) do
    socket =
      socket
      |> assign(:owner_name, "")
      |> assign(:mode, :choose)
      |> assign(:items, [])
      |> assign(:new_item_description, "")
      |> assign(:new_item_price, "")
      |> assign(:uploaded_files, [])
      |> allow_upload(:receipt, accept: ~w(.jpg .jpeg .png), max_entries: 1)

    {:ok, socket}
  end

  @impl true
  def handle_event("set_mode", %{"mode" => mode}, socket) do
    {:noreply, assign(socket, :mode, String.to_atom(mode))}
  end

  @impl true
  def handle_event("validate_name", %{"owner_name" => name}, socket) do
    {:noreply, assign(socket, :owner_name, name)}
  end

  @impl true
  def handle_event("add_item", %{"description" => desc, "price" => price}, socket) do
    if desc != "" and price != "" do
      item = LineItem.new(desc, price)
      items = socket.assigns.items ++ [item]

      socket =
        socket
        |> assign(:items, items)
        |> assign(:new_item_description, "")
        |> assign(:new_item_price, "")

      {:noreply, socket}
    else
      {:noreply, socket}
    end
  end

  @impl true
  def handle_event("remove_item", %{"id" => item_id}, socket) do
    items = Enum.reject(socket.assigns.items, fn item -> item.id == item_id end)
    {:noreply, assign(socket, :items, items)}
  end

  @impl true
  def handle_event("validate_upload", _params, socket) do
    {:noreply, socket}
  end

  @impl true
  def handle_event("process_upload", _params, socket) do
    uploaded_files =
      consume_uploaded_entries(socket, :receipt, fn %{path: path}, _entry ->
        # Process the image with OCR
        case OCR.parse_receipt(path) do
          {:ok, items} ->
            {:ok, items}

          {:error, _reason} ->
            {:postpone, :error}
        end
      end)

    case uploaded_files do
      [items] when is_list(items) ->
        {:noreply, assign(socket, :items, items)}

      _ ->
        {:noreply, put_flash(socket, :error, "Failed to process receipt")}
    end
  end

  @impl true
  def handle_event("create_check", _params, socket) do
    if socket.assigns.owner_name != "" and length(socket.assigns.items) > 0 do
      {:ok, check} = CheckStore.create_check(socket.assigns.owner_name)
      check = CheckSplitter.Check.set_items(check, socket.assigns.items)
      {:ok, check} = CheckStore.update_check(check)

      {:noreply, push_navigate(socket, to: ~p"/check/#{check.id}")}
    else
      {:noreply, put_flash(socket, :error, "Please enter your name and add items")}
    end
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div class="new-check">
      <h2>Create New Check</h2>

      <div class="name-input">
        <.input
          for="owner_name"
          label="Your Name"
          value={@owner_name}
          phx-change="validate_name"
          placeholder="Enter your name"
        />
      </div>

      <%= if @owner_name != "" do %>
        <%= if @mode == :choose do %>
          <div class="mode-selection">
            <h3>How would you like to add items?</h3>

            <div class="mode-buttons">
              <.button phx-click="set_mode" phx-value-mode="manual" class="btn-primary">
                ✍️ Enter Manually
              </.button>

              <.button phx-click="set_mode" phx-value-mode="photo" class="btn-primary">
                📸 Upload Photo
              </.button>
            </div>
          </div>
        <% end %>

        <%= if @mode == :manual do %>
          <div class="manual-entry">
            <h3>Add Items</h3>

            <form phx-submit="add_item">
              <div class="item-form">
                <.input
                  for="description"
                  label="Item Description"
                  value={@new_item_description}
                  placeholder="e.g., Burger"
                />

                <.input
                  for="price"
                  label="Price"
                  type="text"
                  value={@new_item_price}
                  placeholder="0.00"
                />

                <.button type="submit" class="btn-primary">Add Item</.button>
              </div>
            </form>

            <.button phx-click="set_mode" phx-value-mode="choose" class="btn-secondary btn-sm">
              Change Mode
            </.button>
          </div>
        <% end %>

        <%= if @mode == :photo do %>
          <div class="photo-upload">
            <h3>Upload Receipt Photo</h3>

            <form phx-change="validate_upload" phx-submit="process_upload">
              <div class="upload-area">
                <.live_file_input upload={@uploads.receipt} />
              </div>

              <%= for entry <- @uploads.receipt.entries do %>
                <div class="upload-entry">
                  <.live_img_preview entry={entry} width="200" />
                  <progress value={entry.progress} max="100"><%= entry.progress %>%</progress>
                </div>
              <% end %>

              <.button type="submit" class="btn-primary" disabled={@uploads.receipt.entries == []}>
                Process Receipt
              </.button>
            </form>

            <.button phx-click="set_mode" phx-value-mode="choose" class="btn-secondary btn-sm">
              Change Mode
            </.button>
          </div>
        <% end %>

        <%= if length(@items) > 0 do %>
          <div class="items-list">
            <h3>Items (<%= length(@items) %>)</h3>

            <div class="items">
              <%= for item <- @items do %>
                <div class="item">
                  <span class="item-description"><%= item.description %></span>
                  <span class="item-price">$<%= Decimal.to_string(item.price, :normal) %></span>
                  <button
                    type="button"
                    phx-click="remove_item"
                    phx-value-id={item.id}
                    class="btn-remove"
                  >
                    ×
                  </button>
                </div>
              <% end %>
            </div>

            <div class="total">
              <strong>Total:</strong>
              $<%= @items
              |> Enum.map(& &1.price)
              |> Enum.reduce(Decimal.new(0), &Decimal.add/2)
              |> Decimal.to_string(:normal) %>
            </div>

            <.button phx-click="create_check" class="btn-success btn-lg">
              Create Check & Get Share Code
            </.button>
          </div>
        <% end %>
      <% end %>
    </div>
    """
  end
end
