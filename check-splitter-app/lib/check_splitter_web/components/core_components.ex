defmodule CheckSplitterWeb.CoreComponents do
  @moduledoc """
  Provides core UI components.
  """
  use Phoenix.Component

  attr :type, :string, default: "button"
  attr :class, :string, default: ""
  attr :rest, :global
  slot :inner_block, required: true

  def button(assigns) do
    ~H"""
    <button
      type={@type}
      class={["btn", @class]}
      {@rest}
    >
      <%= render_slot(@inner_block) %>
    </button>
    """
  end

  attr :class, :string, default: ""
  attr :rest, :global
  slot :inner_block, required: true

  def card(assigns) do
    ~H"""
    <div class={["card", @class]} {@rest}>
      <%= render_slot(@inner_block) %>
    </div>
    """
  end

  attr :for, :any, required: true
  attr :type, :string, default: "text"
  attr :label, :string, required: true
  attr :class, :string, default: ""
  attr :rest, :global

  def input(assigns) do
    ~H"""
    <div class="form-group">
      <label for={@for}><%= @label %></label>
      <input
        id={@for}
        name={@for}
        type={@type}
        class={["form-input", @class]}
        {@rest}
      />
    </div>
    """
  end

  attr :flash, :map, required: true
  attr :id, :string, default: "flash-group"

  def flash_group(assigns) do
    ~H"""
    <div id={@id}>
      <%= if @flash != %{} do %>
        <%= for {type, msg} <- @flash do %>
          <div class={"flash flash-#{type}"}>
            <%= msg %>
          </div>
        <% end %>
      <% end %>
    </div>
    """
  end

  attr :id, :string, required: true
  attr :suffix, :string, default: nil

  def live_title(assigns) do
    ~H"""
    <title><%= @id %><%= if @suffix, do: " - #{@suffix}", else: "" %></title>
    """
  end
end
